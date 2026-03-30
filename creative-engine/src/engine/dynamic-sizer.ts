import type { TextField, BoundingBox, FieldStyleRule, FieldOverrides } from "../types/index.js";
import { FIELD_STYLE_RULES, DEFAULT_FIELD_RULE } from "../config/themes.js";

export interface SizedField {
  type: string;
  content: string;
  items?: string[];
  fontSize: number;
  lineHeight: number;
  estimatedHeight: number;
  gap: number;
  rule: FieldStyleRule;
  overrides?: FieldOverrides;
}

export interface SizingResult {
  fields: SizedField[];
  baseFontSize: number;
  totalContentHeight: number;
  verticalOffset: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function estimateLines(
  content: string,
  items: string[] | undefined,
  fontSize: number,
  zoneWidth: number,
  maxLines: number,
): number {
  if (items && items.length > 0) {
    return Math.min(items.length, maxLines);
  }

  // Handle <br> tags as explicit line breaks
  const segments = content.split(/<br\s*\/?>/gi);

  let totalLines = 0;
  const charsPerLine = Math.max(1, Math.floor(zoneWidth / (fontSize * 0.52)));

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (trimmed.length === 0) {
      totalLines += 1;
    } else {
      totalLines += Math.ceil(trimmed.length / charsPerLine);
    }
  }

  return Math.min(totalLines, maxLines);
}

export function calculateSizes(
  fields: TextField[],
  textZone: BoundingBox,
): SizingResult {
  const fieldCount = fields.length;

  // 1. Get style rules
  const rules = fields.map((f) => FIELD_STYLE_RULES[f.type] ?? DEFAULT_FIELD_RULE);

  // 2. Calculate base font size using fill-ratio approach
  const totalWeightUnits = rules.reduce((sum, r) => sum + r.sizeWeight, 0);
  const targetFillRatio = 0.75;
  const avgLinesPerField = 1.8;
  const lineHeightMultiplier = 1.15;
  const gapRatio = 0.35;

  const targetHeight = textZone.height * targetFillRatio;
  const heightPerBaseUnit =
    totalWeightUnits * lineHeightMultiplier * avgLinesPerField +
    (fieldCount - 1) * gapRatio;

  let baseFontSize = Math.round(targetHeight / heightPerBaseUnit);

  // Constrain by width: heading shouldn't need more than 3 lines
  const headingField = fields.find((f) => f.type === "heading");
  if (headingField && headingField.content.length > 0) {
    const headingChars = headingField.content.replace(/<br\s*\/?>/gi, "\n").length;
    const maxFontFromWidth = (textZone.width * 2.5) / (headingChars * 0.55);
    baseFontSize = Math.min(baseFontSize, Math.round(maxFontFromWidth));
  }

  // Boost for low field counts
  if (fieldCount === 1) {
    baseFontSize = Math.round(Math.min(baseFontSize * 1.3, 150));
  } else if (fieldCount === 2) {
    baseFontSize = Math.round(Math.min(baseFontSize * 1.15, 140));
  } else if (fieldCount === 3) {
    baseFontSize = Math.round(Math.min(baseFontSize * 1.05, 130));
  }

  // Absolute bounds
  baseFontSize = clamp(baseFontSize, 16, 150);

  // 3. Calculate font sizes and estimate heights
  let sizedFields = fields.map((field, i) => {
    const rule = rules[i]!;
    const fontSize = Math.max(12, Math.round(baseFontSize * rule.sizeWeight));
    const lineHeight = Math.round(fontSize * 1.15);
    const numLines = estimateLines(
      field.content,
      field.items,
      fontSize,
      textZone.width,
      rule.maxLines ?? 10,
    );
    const estimatedHeight = numLines * lineHeight;

    return {
      type: field.type,
      content: field.content,
      items: field.items,
      fontSize,
      lineHeight,
      estimatedHeight,
      gap: 0,
      rule,
    };
  });

  // 4. Distribute remaining space as gaps
  const totalFieldHeight = sizedFields.reduce((sum, f) => sum + f.estimatedHeight, 0);
  const remainingSpace = textZone.height - totalFieldHeight;
  const gapCount = Math.max(1, fieldCount - 1);
  let verticalOffset = 0;

  if (remainingSpace > 0 && gapCount > 0) {
    // Reserve 15% for top padding, 10% for bottom
    const topPadding = remainingSpace * 0.15;
    const bottomPadding = remainingSpace * 0.10;
    const gapSpace = remainingSpace - topPadding - bottomPadding;

    // Weighted gaps: larger gaps after heading/subheading
    const gapWeights = sizedFields.slice(0, -1).map((field, i) => {
      const nextField = sizedFields[i + 1];
      if (field.rule.sizeWeight >= 0.7) return 1.5;
      if (nextField && nextField.rule.sizeWeight >= 0.7) return 1.2;
      return 1.0;
    });

    const totalGapWeight = gapWeights.reduce((a, b) => a + b, 0);

    sizedFields.forEach((field, i) => {
      if (i < gapCount) {
        field.gap = Math.round((gapSpace * (gapWeights[i] ?? 1.0)) / totalGapWeight);
        field.gap = clamp(field.gap, 8, Math.round(baseFontSize * 1.5));
      }
    });

    verticalOffset = Math.round(topPadding);
  } else {
    // Tight fit — minimal gaps
    sizedFields.forEach((field, i) => {
      if (i < gapCount) {
        field.gap = Math.max(6, Math.round(baseFontSize * 0.15));
      }
    });
    verticalOffset = 0;
  }

  // 5. Total content height
  let totalContentHeight = sizedFields.reduce(
    (sum, f) => sum + f.estimatedHeight + f.gap,
    0,
  );

  // 6. If overflowing, shrink
  if (totalContentHeight + verticalOffset > textZone.height) {
    const shrinkRatio = (textZone.height * 0.95) / (totalContentHeight + verticalOffset);

    sizedFields = sizedFields.map((f, i) => {
      const newFontSize = Math.max(10, Math.round(f.fontSize * shrinkRatio));
      const newLineHeight = Math.round(newFontSize * 1.15);
      const numLines = estimateLines(
        f.content,
        f.items,
        newFontSize,
        textZone.width,
        f.rule.maxLines ?? 10,
      );
      const newGap = i < fieldCount - 1
        ? Math.max(4, Math.round(f.gap * shrinkRatio))
        : 0;

      return {
        ...f,
        fontSize: newFontSize,
        lineHeight: newLineHeight,
        estimatedHeight: numLines * newLineHeight,
        gap: newGap,
      };
    });

    baseFontSize = Math.round(baseFontSize * shrinkRatio);

    totalContentHeight = sizedFields.reduce(
      (sum, f) => sum + f.estimatedHeight + f.gap,
      0,
    );
    verticalOffset = Math.max(0, Math.round((textZone.height - totalContentHeight) * 0.12));
  }

  return {
    fields: sizedFields,
    baseFontSize,
    totalContentHeight,
    verticalOffset,
  };
}
