import type {
  CanvasDefinition,
  ThemeDefinition,
} from "../../types/index.js";
import type {
  ResolvedBlock,
  PositionedBlock,
  TextZone,
} from "../types.js";

/**
 * Parses a CSS dimension string to pixels, resolving percentages against a reference.
 */
function parseDimension(value: string, referencePx: number): number {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    return Math.round((parseFloat(trimmed) / 100) * referencePx);
  }
  return Math.round(parseFloat(trimmed));
}

/**
 * Parses a CSS font size string to pixels.
 */
function parseFontSizePx(fontSize: string): number {
  const trimmed = fontSize.trim();
  if (trimmed.endsWith("rem") || trimmed.endsWith("em")) {
    return parseFloat(trimmed) * 16;
  }
  return parseFloat(trimmed);
}

/**
 * Estimates the height of a pinned block based on its styles.
 */
function estimatePinnedBlockHeight(block: ResolvedBlock): number {
  const fontSize = parseFontSizePx(block.resolvedStyles.fontSize);
  const lineHeight = fontSize * block.resolvedStyles.lineHeight;
  const paddingParts = block.resolvedStyles.padding
    .trim()
    .split(/\s+/)
    .map((p) => parseFloat(p) || 0);
  const vertPadding =
    paddingParts.length >= 2
      ? (paddingParts[0]!) + (paddingParts[2] ?? paddingParts[0]!)
      : (paddingParts[0] ?? 0) * 2;
  return Math.ceil(lineHeight + vertPadding);
}

/**
 * Calculates final pixel coordinates for every block.
 *
 * - Stacked blocks are laid out top-to-bottom within the text zone.
 * - Pinned blocks are positioned relative to the full canvas based on their pinPosition.
 */
export function calculatePositions(
  stackedBlocks: ResolvedBlock[],
  pinnedBlocks: ResolvedBlock[],
  allocatedHeights: number[],
  textZone: TextZone,
  canvas: CanvasDefinition,
  theme: ThemeDefinition
): { stacked: PositionedBlock[]; pinned: PositionedBlock[] } {
  const blockGap = parseFloat(theme.layout.blockGap) || 0;
  const contentPadding = parseDimension(
    theme.layout.contentPadding,
    canvas.width
  );

  // --- Stacked blocks ---
  let currentY = textZone.y;
  const stacked: PositionedBlock[] = stackedBlocks.map((block, i) => {
    const height = allocatedHeights[i]!;
    const positioned: PositionedBlock = {
      ...block,
      bounds: {
        x: textZone.x,
        y: Math.round(currentY),
        width: textZone.width,
        height,
      },
    };

    // Track if font was scaled
    if (
      block.resolvedStyles.fontSize !==
      block.definition.defaultStyles.fontSize
    ) {
      positioned.scaledFontSize = block.resolvedStyles.fontSize;
    }

    currentY += height + blockGap;
    return positioned;
  });

  // --- Pinned blocks ---
  const pinned: PositionedBlock[] = pinnedBlocks.map((block) => {
    const blockHeight = estimatePinnedBlockHeight(block);
    const blockWidth = parseDimension(
      block.resolvedStyles.maxWidth,
      canvas.width
    );

    let x: number;
    let y: number;
    let width = blockWidth;
    let height = blockHeight;

    switch (block.pinPosition) {
      case "top-left":
        x = contentPadding;
        y = contentPadding;
        break;
      case "top-right":
        x = canvas.width - blockWidth - contentPadding;
        y = contentPadding;
        break;
      case "top-center":
        x = Math.round((canvas.width - blockWidth) / 2);
        y = contentPadding;
        break;
      case "bottom-left":
        x = contentPadding;
        y = canvas.height - blockHeight - contentPadding;
        break;
      case "bottom-right":
        x = canvas.width - blockWidth - contentPadding;
        y = canvas.height - blockHeight - contentPadding;
        break;
      case "bottom-center":
        x = Math.round((canvas.width - blockWidth) / 2);
        y = canvas.height - blockHeight - contentPadding;
        break;
      case "bottom-strip":
        x = 0;
        y = canvas.height - blockHeight;
        width = canvas.width;
        break;
      default:
        x = contentPadding;
        y = contentPadding;
        break;
    }

    return {
      ...block,
      bounds: {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      },
    };
  });

  return { stacked, pinned };
}
