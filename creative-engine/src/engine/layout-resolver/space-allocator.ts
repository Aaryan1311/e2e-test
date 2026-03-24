import type { ThemeDefinition } from "../../types/index.js";
import type { ResolvedBlock, TextZone } from "../types.js";

/**
 * Parses a CSS font size string (e.g., "48px", "2rem") to a number in pixels.
 * Assumes 1rem = 16px.
 */
function parseFontSizePx(fontSize: string): number {
  const trimmed = fontSize.trim();
  if (trimmed.endsWith("rem")) {
    return parseFloat(trimmed) * 16;
  }
  if (trimmed.endsWith("em")) {
    return parseFloat(trimmed) * 16;
  }
  return parseFloat(trimmed);
}

/**
 * Parses a CSS padding string and returns the total vertical padding in pixels.
 * Supports 1, 2, 3, or 4 value shorthand.
 */
function parseVerticalPadding(padding: string): number {
  const parts = padding
    .trim()
    .split(/\s+/)
    .map((p) => parseFloat(p) || 0);
  if (parts.length === 1) return (parts[0]!) * 2;
  if (parts.length === 2) return (parts[0]!) * 2;
  if (parts.length === 3) return (parts[0]!) + (parts[2]!);
  if (parts.length >= 4) return (parts[0]!) + (parts[2]!);
  return 0;
}

/**
 * Parses the theme blockGap string to pixels.
 */
function parseGap(gap: string): number {
  return parseFloat(gap) || 0;
}

/**
 * Estimates the natural height of a block in pixels based on its content,
 * font size, line height, max lines, and available width.
 */
function estimateBlockHeight(
  block: ResolvedBlock,
  zoneWidth: number,
  fontSizePx: number
): number {
  const lineHeightPx = fontSizePx * block.resolvedStyles.lineHeight;
  const verticalPadding = parseVerticalPadding(block.resolvedStyles.padding);

  // For list-type blocks, count items
  if (block.items && block.items.length > 0) {
    const itemCount = block.definition.maxLines
      ? Math.min(block.items.length, block.definition.maxLines)
      : block.items.length;
    return Math.ceil(itemCount * lineHeightPx + verticalPadding);
  }

  // For brand-divider or non-text blocks with no content
  if (!block.content || block.content.length === 0) {
    return Math.ceil(lineHeightPx + verticalPadding);
  }

  // Estimate characters per line (rough: each char ≈ 0.6 × fontSize)
  const charsPerLine = Math.max(1, Math.floor(zoneWidth / (fontSizePx * 0.6)));
  let numberOfLines = Math.ceil(block.content.length / charsPerLine);

  // Clamp to maxLines if defined
  if (block.definition.maxLines) {
    numberOfLines = Math.min(numberOfLines, block.definition.maxLines);
  }

  return Math.ceil(numberOfLines * lineHeightPx + verticalPadding);
}

/**
 * Allocates vertical space for stacked blocks within the text zone.
 *
 * Algorithm:
 * 1. Calculate usable height (total - gaps)
 * 2. Estimate each block's natural height
 * 3. If everything fits, distribute leftover space
 * 4. If too tall, scale down scalable blocks (respecting minFontSize)
 * 5. If still too tall after scaling, warn about content overflow
 */
export function allocateSpace(
  stackedBlocks: ResolvedBlock[],
  textZone: TextZone,
  theme: ThemeDefinition
): {
  blocks: ResolvedBlock[];
  allocatedHeights: number[];
  wasScaled: boolean;
  totalHeight: number;
} {
  if (stackedBlocks.length === 0) {
    return { blocks: [], allocatedHeights: [], wasScaled: false, totalHeight: 0 };
  }

  const blockGap = parseGap(theme.layout.blockGap);
  const gapSpace = (stackedBlocks.length - 1) * blockGap;
  const usableHeight = textZone.height - gapSpace;

  // Calculate natural heights
  const fontSizes = stackedBlocks.map((b) =>
    parseFontSizePx(b.resolvedStyles.fontSize)
  );
  let heights = stackedBlocks.map((b, i) =>
    estimateBlockHeight(b, textZone.width, fontSizes[i]!)
  );
  let totalNaturalHeight = heights.reduce((sum, h) => sum + h, 0);

  let wasScaled = false;

  // If everything fits, no scaling needed
  if (totalNaturalHeight <= usableHeight) {
    return {
      blocks: stackedBlocks,
      allocatedHeights: heights,
      wasScaled: false,
      totalHeight: totalNaturalHeight,
    };
  }

  // Need to scale down — calculate ratio
  const ratio = usableHeight / totalNaturalHeight;

  const scaledFontSizes = fontSizes.map((size, i) => {
    const block = stackedBlocks[i]!;
    if (!block.definition.scalable) return size;

    const minSize = block.definition.minFontSize
      ? parseFontSizePx(block.definition.minFontSize)
      : size * 0.5;
    const newSize = Math.max(minSize, Math.round(size * ratio));
    if (newSize < size) wasScaled = true;
    return newSize;
  });

  // Recalculate heights with scaled font sizes
  heights = stackedBlocks.map((b, i) =>
    estimateBlockHeight(b, textZone.width, scaledFontSizes[i]!)
  );
  totalNaturalHeight = heights.reduce((sum, h) => sum + h, 0);

  // Update resolved styles with scaled font sizes
  const updatedBlocks = stackedBlocks.map((block, i) => {
    if (scaledFontSizes[i] !== fontSizes[i]) {
      return {
        ...block,
        resolvedStyles: {
          ...block.resolvedStyles,
          fontSize: `${scaledFontSizes[i]}px`,
        },
      };
    }
    return block;
  });

  if (totalNaturalHeight > usableHeight) {
    console.warn(
      "Content overflow — blocks may be clipped. " +
        `Total height: ${totalNaturalHeight}px, available: ${usableHeight}px`
    );
  }

  return {
    blocks: updatedBlocks,
    allocatedHeights: heights,
    wasScaled,
    totalHeight: totalNaturalHeight,
  };
}
