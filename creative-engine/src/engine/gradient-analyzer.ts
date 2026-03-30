import sharp from "sharp";
import type { BoundingBox } from "../types/index.js";

export interface GradientColors {
  /** Dominant color in the top third of the text zone */
  top: string;
  /** Dominant color in the middle third */
  middle: string;
  /** Dominant color in the bottom third */
  bottom: string;
  /** Single best color for a uniform gradient */
  dominant: string;
}

/**
 * Analyzes the image in the text zone region to determine
 * natural gradient colors that blend with the background.
 */
export async function analyzeGradientColors(
  imagePath: string,
  textZone: BoundingBox,
  imageWidth: number,
  imageHeight: number,
): Promise<GradientColors> {
  // Clamp extraction region to image bounds
  const left = Math.max(0, Math.round(textZone.x));
  const top = Math.max(0, Math.round(textZone.y));
  const extractWidth = Math.min(Math.round(textZone.width), imageWidth - left);
  const extractHeight = Math.min(Math.round(textZone.height), imageHeight - top);

  if (extractWidth <= 0 || extractHeight <= 0) {
    const fallback = "rgba(255, 255, 255, 0.88)";
    return { top: fallback, middle: fallback, bottom: fallback, dominant: fallback };
  }

  const { data, info } = await sharp(imagePath)
    .extract({ left, top, width: extractWidth, height: extractHeight })
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = 4;

  const bandHeight = Math.floor(height / 3);

  const bands = [
    { startY: 0, endY: bandHeight },
    { startY: bandHeight, endY: bandHeight * 2 },
    { startY: bandHeight * 2, endY: height },
  ];

  const bandColors: Array<{ r: number; g: number; b: number }> = [];

  let totalR = 0, totalG = 0, totalB = 0, totalCount = 0;

  for (const band of bands) {
    let bR = 0, bG = 0, bB = 0, count = 0;
    for (let y = band.startY; y < band.endY; y += 10) {
      for (let x = 0; x < width; x += 10) {
        const idx = (y * width + x) * channels;
        bR += data[idx]!;
        bG += data[idx + 1]!;
        bB += data[idx + 2]!;
        count++;
      }
    }
    if (count === 0) count = 1;
    const avgR = Math.round(bR / count);
    const avgG = Math.round(bG / count);
    const avgB = Math.round(bB / count);
    bandColors.push({ r: avgR, g: avgG, b: avgB });

    totalR += bR;
    totalG += bG;
    totalB += bB;
    totalCount += count;
  }

  if (totalCount === 0) totalCount = 1;
  const domR = Math.round(totalR / totalCount);
  const domG = Math.round(totalG / totalCount);
  const domB = Math.round(totalB / totalCount);

  const opacity = 0.88;

  return {
    top: `rgba(${bandColors[0]!.r}, ${bandColors[0]!.g}, ${bandColors[0]!.b}, ${opacity})`,
    middle: `rgba(${bandColors[1]!.r}, ${bandColors[1]!.g}, ${bandColors[1]!.b}, ${opacity})`,
    bottom: `rgba(${bandColors[2]!.r}, ${bandColors[2]!.g}, ${bandColors[2]!.b}, ${opacity})`,
    dominant: `rgba(${domR}, ${domG}, ${domB}, ${opacity})`,
  };
}
