import type { TextField, BoundingBox, FieldStyleRule } from "../types/index.js";
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
  const charsPerLine = Math.max(1, Math.floor(zoneWidth / (fontSize * 0.55)));
  const numLines = Math.ceil(content.length / charsPerLine);
  return Math.min(numLines, maxLines);
}

export function calculateSizes(
  fields: TextField[],
  textZone: BoundingBox,
): SizingResult {
  const fieldCount = fields.length;

  // 1. Get style rules
  const rules = fields.map((f) => FIELD_STYLE_RULES[f.type] ?? DEFAULT_FIELD_RULE);

  // 2. Calculate base font size
  let maxBaseFontSize = textZone.height / (fieldCount * 2.5);

  // Also constrain by width for the heading field
  const headingField = fields.find((f) => f.type === "heading");
  if (headingField && headingField.content.length > 0) {
    const avgHeadingChars = Math.max(headingField.content.length / 2, 5);
    const maxFontFromWidth = (textZone.width / (0.55 * avgHeadingChars)) * 1.0;
    maxBaseFontSize = Math.min(maxBaseFontSize, maxFontFromWidth);
  }

  let baseFontSize = clamp(Math.round(maxBaseFontSize), 14, 120);

  // 3. Calculate font sizes and estimate heights
  let sizedFields = fields.map((field, i) => {
    const rule = rules[i]!;
    const fontSize = Math.max(10, Math.round(baseFontSize * rule.sizeWeight));
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

  // 4. Calculate gaps
  const baseGap = Math.round(baseFontSize * 0.4);
  const totalFieldHeight = sizedFields.reduce((sum, f) => sum + f.estimatedHeight, 0);
  const totalGapSpace = textZone.height - totalFieldHeight;
  const gapCount = Math.max(1, fieldCount - 1);

  if (totalGapSpace > 0 && gapCount > 0) {
    const calculatedGap = Math.floor(totalGapSpace / (gapCount + 2));
    const cappedGap = clamp(calculatedGap, 4, baseFontSize * 0.8);
    sizedFields.forEach((f, i) => {
      f.gap = i < fieldCount - 1 ? cappedGap : 0;
    });
  } else {
    sizedFields.forEach((f, i) => {
      f.gap = i < fieldCount - 1 ? Math.max(4, Math.round(baseFontSize * 0.15)) : 0;
    });
  }

  // 5. Total content height
  let totalContentHeight = sizedFields.reduce(
    (sum, f) => sum + f.estimatedHeight + f.gap,
    0,
  );

  // 6. Vertical centering offset
  let verticalOffset = 0;
  if (totalContentHeight < textZone.height) {
    verticalOffset = Math.round((textZone.height - totalContentHeight) * 0.4);
  }

  // 7. If overflowing, shrink
  if (totalContentHeight > textZone.height) {
    const shrinkRatio = (textZone.height * 0.95) / totalContentHeight;

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
    verticalOffset = 0;
  }

  return {
    fields: sizedFields,
    baseFontSize,
    totalContentHeight,
    verticalOffset,
  };
}
