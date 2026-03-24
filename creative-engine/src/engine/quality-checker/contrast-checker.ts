import type { ThemeDefinition } from "../../types/index.js";
import type { PositionedBlock, OverlayConfig, QualityCheck } from "../types.js";

/**
 * Parses a CSS color string to RGB values (0-255).
 * Supports: #RGB, #RRGGBB, #RRGGBBAA, rgb(), rgba().
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
  const trimmed = color.trim();

  // Hex colors
  const hexMatch = trimmed.match(/^#([0-9a-fA-F]+)$/);
  if (hexMatch) {
    const hex = hexMatch[1]!;
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0]! + hex[0]!, 16),
        g: parseInt(hex[1]! + hex[1]!, 16),
        b: parseInt(hex[2]! + hex[2]!, 16),
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  // rgb()/rgba()
  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]!, 10),
      g: parseInt(rgbMatch[2]!, 10),
      b: parseInt(rgbMatch[3]!, 10),
    };
  }

  return null;
}

/**
 * Calculates relative luminance of a color (WCAG formula).
 * RGB values should be 0-255.
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const linearize = (v: number): number => {
    const sRGB = v / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Calculates WCAG contrast ratio between two luminance values.
 */
function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parses font size string to pixels.
 */
function parseFontSizePx(fontSize: string): number {
  if (fontSize.endsWith("rem") || fontSize.endsWith("em")) return parseFloat(fontSize) * 16;
  return parseFloat(fontSize);
}

/**
 * Validates text readability by estimating contrast ratios.
 * Uses WCAG AA standards: 4.5:1 for normal text, 3:1 for large text (>=24px).
 */
export function checkContrast(
  blocks: PositionedBlock[],
  overlay: OverlayConfig,
  theme: ThemeDefinition
): QualityCheck {
  const failures: string[] = [];

  // Estimate background color from overlay/theme
  // For gradient overlays, assume a mid-tone based on the theme
  let bgLuminance: number;
  if (overlay.type === "none") {
    bgLuminance = 0.5; // Unknown, assume mid-tone
  } else {
    // Try to parse the overlay CSS for a color hint
    const bgColor = parseColor(theme.colors.primary);
    if (bgColor) {
      // Blend with overlay opacity
      const baseLum = relativeLuminance(bgColor.r, bgColor.g, bgColor.b);
      bgLuminance = baseLum * overlay.opacity + 0.5 * (1 - overlay.opacity);
    } else {
      bgLuminance = 0.5;
    }
  }

  for (const block of blocks) {
    const textColor = parseColor(block.resolvedStyles.color);
    if (!textColor) continue;

    const textLum = relativeLuminance(textColor.r, textColor.g, textColor.b);
    const ratio = contrastRatio(textLum, bgLuminance);

    const fontSize = parseFontSizePx(
      block.scaledFontSize ?? block.resolvedStyles.fontSize
    );
    const isLargeText = fontSize >= 24;
    const minRatio = isLargeText ? 3.0 : 4.5;

    if (ratio < minRatio) {
      failures.push(
        `"${block.type}" contrast ratio ${ratio.toFixed(1)}:1 below ${minRatio}:1 minimum`
      );
    }
  }

  return {
    name: "contrast",
    passed: failures.length === 0,
    details: failures.length === 0
      ? "All text blocks meet contrast requirements"
      : `${failures.length} block(s) with low contrast: ${failures.join("; ")}`,
    severity: "warning",
  };
}
