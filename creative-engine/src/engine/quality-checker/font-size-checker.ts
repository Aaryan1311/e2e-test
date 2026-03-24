import type { PositionedBlock, QualityCheck } from "../types.js";

/**
 * Parses a CSS font size string to pixels.
 */
function parseFontSizePx(fontSize: string): number {
  const trimmed = fontSize.trim();
  if (trimmed.endsWith("rem") || trimmed.endsWith("em")) return parseFloat(trimmed) * 16;
  return parseFloat(trimmed);
}

/**
 * Validates that no text block has a font size too small to read.
 * Minimums: 6px for disclaimers, 10px for all other blocks.
 */
export function checkFontSizes(
  blocks: PositionedBlock[]
): QualityCheck {
  const failures: string[] = [];

  for (const block of blocks) {
    const fontSize = parseFontSizePx(
      block.scaledFontSize ?? block.resolvedStyles.fontSize
    );
    const minSize = block.type === "disclaimer" ? 6 : 10;

    if (fontSize < minSize) {
      failures.push(
        `"${block.type}" font size ${fontSize}px is below minimum ${minSize}px`
      );
    }
  }

  return {
    name: "font-size",
    passed: failures.length === 0,
    details: failures.length === 0
      ? "All font sizes meet readability minimums"
      : `${failures.length} font size issue(s): ${failures.join("; ")}`,
    severity: "error",
  };
}
