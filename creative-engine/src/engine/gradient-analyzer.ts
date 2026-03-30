import sharp from "sharp";
import type { BoundingBox } from "../types/index.js";

export interface AnalyzedGradient {
  /** Average color of the top portion of the text zone area */
  topColor: { r: number; g: number; b: number };
  /** Average color of the middle portion */
  middleColor: { r: number; g: number; b: number };
  /** Average color of the bottom portion */
  bottomColor: { r: number; g: number; b: number };
}

/**
 * Analyzes the image in the text zone region to determine
 * natural gradient colors that blend with the background.
 */
export async function analyzeImageColors(
  imagePath: string,
  textZone: BoundingBox,
): Promise<AnalyzedGradient> {
  const metadata = await sharp(imagePath).metadata();
  const imgW = metadata.width!;
  const imgH = metadata.height!;

  // Clamp extraction region to image bounds
  const left = Math.max(0, Math.round(textZone.x));
  const top = Math.max(0, Math.round(textZone.y));
  const extractWidth = Math.min(Math.round(textZone.width), imgW - left);
  const extractHeight = Math.min(Math.round(textZone.height), imgH - top);

  if (extractWidth <= 0 || extractHeight <= 0) {
    return {
      topColor: { r: 255, g: 255, b: 255 },
      middleColor: { r: 255, g: 255, b: 255 },
      bottomColor: { r: 255, g: 255, b: 255 },
    };
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

  for (const band of bands) {
    let bR = 0, bG = 0, bB = 0, count = 0;
    for (let y = band.startY; y < band.endY; y += 8) {
      for (let x = 0; x < width; x += 8) {
        const idx = (y * width + x) * channels;
        bR += data[idx]!;
        bG += data[idx + 1]!;
        bB += data[idx + 2]!;
        count++;
      }
    }
    if (count === 0) count = 1;
    bandColors.push({
      r: Math.round(bR / count),
      g: Math.round(bG / count),
      b: Math.round(bB / count),
    });
  }

  return {
    topColor: bandColors[0]!,
    middleColor: bandColors[1]!,
    bottomColor: bandColors[2]!,
  };
}
