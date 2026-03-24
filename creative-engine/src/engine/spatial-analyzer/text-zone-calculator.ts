import type { ThemeDefinition } from "../../types/index.js";
import type { BoundingBox, TextZone } from "../types.js";

/** Estimated height reserved for the logo area */
const LOGO_HEIGHT_ESTIMATE = 60;

/** Estimated height reserved for the disclaimer strip at the bottom */
const DISCLAIMER_STRIP_HEIGHT = 40;

/** Minimum text zone width as a fraction of canvas width */
const MIN_TEXT_ZONE_WIDTH_RATIO = 0.3;

/** Maximum text zone width as a fraction of canvas width */
const MAX_TEXT_ZONE_WIDTH_RATIO = 0.7;

/**
 * Parses a CSS-like dimension string (e.g., "40px", "55%") to pixels.
 * Percentages are resolved against the provided reference dimension.
 */
function parseDimension(value: string, referencePx: number): number {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    return Math.round((parseFloat(trimmed) / 100) * referencePx);
  }
  if (trimmed.endsWith("px")) {
    return Math.round(parseFloat(trimmed));
  }
  return Math.round(parseFloat(trimmed));
}

/**
 * Calculates the optimal text zone given canvas dimensions, subject position,
 * and theme configuration.
 *
 * Rules:
 * - Subject on right (center x > 55%) → text on left
 * - Subject on left (center x < 45%) → text on right
 * - Subject centered or no subject → use theme defaults
 * - Width clamped between 30% and 70% of canvas width
 */
export function calculateTextZone(
  canvasDimensions: { width: number; height: number },
  subjectBounds: BoundingBox | null,
  theme: ThemeDefinition
): TextZone {
  const { width: canvasW, height: canvasH } = canvasDimensions;
  const contentPadding = parseDimension(theme.layout.contentPadding, canvasW);
  const minWidth = Math.round(canvasW * MIN_TEXT_ZONE_WIDTH_RATIO);
  const maxWidth = Math.round(canvasW * MAX_TEXT_ZONE_WIDTH_RATIO);

  // Vertical bounds are the same for all cases
  const y = contentPadding + LOGO_HEIGHT_ESTIMATE;
  const height = Math.max(
    0,
    canvasH - contentPadding * 2 - LOGO_HEIGHT_ESTIMATE - DISCLAIMER_STRIP_HEIGHT
  );

  /** Clamp width between min and max */
  const clampWidth = (w: number): number =>
    Math.round(Math.max(minWidth, Math.min(maxWidth, w)));

  // No subject detected → use theme defaults
  if (!subjectBounds) {
    const defaultWidth = parseDimension(
      theme.layout.defaultTextZoneWidth,
      canvasW
    );
    const side = theme.layout.defaultTextZoneSide;
    const w = clampWidth(defaultWidth);
    const x =
      side === "left"
        ? contentPadding
        : canvasW - w - contentPadding;

    return { x, y, width: w, height, side };
  }

  // Determine which side the subject is on
  const subjectCenterX = subjectBounds.x + subjectBounds.width / 2;
  const subjectRatio = subjectCenterX / canvasW;

  if (subjectRatio > 0.55) {
    // Subject on the RIGHT → text on LEFT
    const rawWidth = subjectBounds.x - contentPadding * 2;
    const w = clampWidth(rawWidth);
    return { x: contentPadding, y, width: w, height, side: "left" };
  }

  if (subjectRatio < 0.45) {
    // Subject on the LEFT → text on RIGHT
    const textX =
      subjectBounds.x + subjectBounds.width + contentPadding;
    const rawWidth = canvasW - textX - contentPadding;
    const w = clampWidth(rawWidth);
    const x = canvasW - w - contentPadding;
    return { x, y, width: w, height, side: "right" };
  }

  // Subject is CENTERED → use theme defaults
  const defaultWidth = parseDimension(
    theme.layout.defaultTextZoneWidth,
    canvasW
  );
  const side = theme.layout.defaultTextZoneSide;
  const w = clampWidth(defaultWidth);
  const x =
    side === "left"
      ? contentPadding
      : canvasW - w - contentPadding;

  return { x, y, width: w, height, side };
}
