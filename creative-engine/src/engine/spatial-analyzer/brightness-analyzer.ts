import sharp from "sharp";
import type { ThemeDefinition } from "../../types/index.js";
import type { TextZone, OverlayConfig } from "../types.js";

/**
 * Analyzes the brightness of the image within the text zone area to determine
 * optimal overlay settings for text readability.
 *
 * Brightness thresholds:
 * - > 180: Very bright background → reduce overlay opacity
 * - 100–180: Medium → use theme default opacity
 * - < 100: Dark → boost overlay opacity
 * - Std deviation > 60: Busy area → increase opacity by 20%
 */
export async function analyzeBrightness(
  imagePath: string,
  textZone: TextZone,
  theme: ThemeDefinition
): Promise<OverlayConfig> {
  const baseOverlay: OverlayConfig = {
    type: theme.overlay.type,
    direction: theme.overlay.direction,
    css: theme.overlay.value,
    opacity: theme.overlay.fallbackOpacity,
  };

  try {
    const metadata = await sharp(imagePath).metadata();
    const imgWidth = metadata.width ?? 0;
    const imgHeight = metadata.height ?? 0;

    if (imgWidth === 0 || imgHeight === 0) {
      return baseOverlay;
    }

    // Clamp extraction region to image bounds
    const left = Math.max(0, Math.min(textZone.x, imgWidth - 1));
    const top = Math.max(0, Math.min(textZone.y, imgHeight - 1));
    const extractWidth = Math.max(1, Math.min(textZone.width, imgWidth - left));
    const extractHeight = Math.max(
      1,
      Math.min(textZone.height, imgHeight - top)
    );

    const buffer = await sharp(imagePath)
      .extract({
        left: Math.round(left),
        top: Math.round(top),
        width: Math.round(extractWidth),
        height: Math.round(extractHeight),
      })
      .grayscale()
      .raw()
      .toBuffer();

    const pixels = new Uint8Array(buffer);
    const n = pixels.length;
    if (n === 0) return baseOverlay;

    // Calculate mean brightness
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += pixels[i]!;
    }
    const meanBrightness = sum / n;

    // Calculate standard deviation
    let varianceSum = 0;
    for (let i = 0; i < n; i++) {
      const diff = pixels[i]! - meanBrightness;
      varianceSum += diff * diff;
    }
    const stdDev = Math.sqrt(varianceSum / n);

    // Determine opacity based on brightness
    let opacity: number;
    if (meanBrightness > 180) {
      opacity = theme.overlay.fallbackOpacity * 0.5;
    } else if (meanBrightness >= 100) {
      opacity = theme.overlay.fallbackOpacity;
    } else {
      opacity = Math.min(theme.overlay.fallbackOpacity * 1.5, 0.95);
    }

    // High variance (busy area) → increase opacity by 20%
    if (stdDev > 60) {
      opacity = Math.min(opacity * 1.2, 0.95);
    }

    return {
      ...baseOverlay,
      opacity: Math.round(opacity * 100) / 100,
    };
  } catch (error) {
    console.warn(
      `Brightness analysis failed, using theme defaults: ${error instanceof Error ? error.message : String(error)}`
    );
    return baseOverlay;
  }
}
