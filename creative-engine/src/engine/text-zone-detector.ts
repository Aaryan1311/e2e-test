import sharp from "sharp";
import type { BoundingBox, ImageType, Theme } from "../types/index.js";

export interface TextZoneResult {
  textZone: BoundingBox;
  isOnSolidBackground: boolean;
  solidBackgroundColor?: string;
  needsOverlay: boolean;
  overlayZone?: BoundingBox;
  textSide?: "left" | "right" | "top";
  subjectStartX?: number;
  subjectStartY?: number;
}

/**
 * Detects where text should be placed on the image based on image type.
 */
export async function detectTextZone(
  imagePath: string,
  imageType: ImageType,
  theme: Theme,
): Promise<TextZoneResult> {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  switch (imageType) {
    case "split":
      return detectSplitZone(imagePath, width, height, theme);
    case "full":
      return detectFullZone(imagePath, width, height);
    case "portrait":
      return detectPortraitZone(imagePath, width, height);
  }
}

/**
 * For split images: detect the solid color panel and use it as the text zone.
 */
async function detectSplitZone(
  imagePath: string,
  width: number,
  height: number,
  theme: Theme,
): Promise<TextZoneResult> {
  const { data } = await sharp(imagePath)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const channels = 4; // RGBA

  // Sample vertical strips at 5% and 95% of width
  const leftX = Math.floor(width * 0.05);
  const rightX = Math.floor(width * 0.95);

  const leftColors = sampleVerticalStrip(data, width, height, channels, leftX);
  const rightColors = sampleVerticalStrip(data, width, height, channels, rightX);

  const leftSolid = isStripSolid(leftColors);
  const rightSolid = isStripSolid(rightColors);

  // Parse primary color for matching
  const primaryRGB = hexToRGB(theme.colors.primary);

  let panelSide: "left" | "right" | null = null;
  let detectedColor: { r: number; g: number; b: number } | null = null;

  if (leftSolid.isSolid) {
    const match = isColorClose(leftSolid.avgColor, primaryRGB, 40) ||
      isColorClose(leftSolid.avgColor, { r: 255, g: 255, b: 255 }, 40) ||
      isColorClose(leftSolid.avgColor, { r: 0, g: 0, b: 90 }, 40);
    if (match || leftSolid.stdDev < 15) {
      panelSide = "left";
      detectedColor = leftSolid.avgColor;
    }
  }

  if (!panelSide && rightSolid.isSolid) {
    const match = isColorClose(rightSolid.avgColor, primaryRGB, 40) ||
      isColorClose(rightSolid.avgColor, { r: 255, g: 255, b: 255 }, 40) ||
      isColorClose(rightSolid.avgColor, { r: 0, g: 0, b: 90 }, 40);
    if (match || rightSolid.stdDev < 15) {
      panelSide = "right";
      detectedColor = rightSolid.avgColor;
    }
  }

  if (!panelSide) {
    // Fallback: treat left 45% as text zone with overlay
    console.warn("[TextZoneDetector] No solid panel detected, using left 45% fallback with overlay");
    const padding = width * 0.06;
    return {
      textZone: {
        x: padding,
        y: height * 0.08,
        width: width * 0.45 - padding * 2,
        height: height * 0.84,
      },
      isOnSolidBackground: false,
      needsOverlay: true,
      overlayZone: {
        x: 0,
        y: 0,
        width: width * 0.6,
        height,
      },
      textSide: "left",
    };
  }

  // Binary search for panel edge
  const panelWidth = findPanelEdge(data, width, height, channels, panelSide);
  const padding = panelWidth * 0.08;
  const panelX = panelSide === "left" ? 0 : width - panelWidth;

  const colorHex = detectedColor
    ? `#${detectedColor.r.toString(16).padStart(2, "0")}${detectedColor.g.toString(16).padStart(2, "0")}${detectedColor.b.toString(16).padStart(2, "0")}`
    : theme.colors.primary;

  return {
    textZone: {
      x: panelX + padding,
      y: padding,
      width: panelWidth - padding * 2,
      height: height - padding * 2,
    },
    isOnSolidBackground: true,
    solidBackgroundColor: colorHex,
    needsOverlay: false,
    textSide: panelSide,
  };
}

/**
 * For full images: detect subject and place text on the opposite side.
 */
async function detectFullZone(
  imagePath: string,
  width: number,
  height: number,
): Promise<TextZoneResult> {
  const { data } = await sharp(imagePath)
    .resize(64, 64, { fit: "fill" })
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  // 4x4 grid variance analysis
  const gridCols = 4;
  const gridRows = 4;
  const cellW = 64 / gridCols;
  const cellH = 64 / gridRows;
  const channels = 4;

  const columnVariance = new Array(gridCols).fill(0);

  for (let col = 0; col < gridCols; col++) {
    let totalVariance = 0;
    for (let row = 0; row < gridRows; row++) {
      const pixels: number[] = [];
      for (let y = Math.floor(row * cellH); y < Math.floor((row + 1) * cellH); y++) {
        for (let x = Math.floor(col * cellW); x < Math.floor((col + 1) * cellW); x++) {
          const idx = (y * 64 + x) * channels;
          const gray = data[idx]! * 0.299 + data[idx + 1]! * 0.587 + data[idx + 2]! * 0.114;
          pixels.push(gray);
        }
      }
      const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
      const variance = pixels.reduce((a, b) => a + (b - mean) ** 2, 0) / pixels.length;
      totalVariance += variance;
    }
    columnVariance[col] = totalVariance / gridRows;
  }

  // Subject is in columns with highest variance
  const leftAvg = (columnVariance[0]! + columnVariance[1]!) / 2;
  const rightAvg = (columnVariance[2]! + columnVariance[3]!) / 2;

  const subjectOnRight = rightAvg >= leftAvg;
  const textSide = subjectOnRight ? "left" : "right";

  // Calculate subject start X: where the high-variance columns begin
  // Each column covers 25% of width (4 columns total)
  const subjectStartX = subjectOnRight
    ? Math.round(width * 0.5)   // subject in right half
    : 0;                         // subject in left half

  const textZoneWidth = Math.floor(width * 0.48);
  const paddingX = Math.floor(width * 0.06);
  const paddingY = Math.floor(height * 0.08);

  const textZoneX = textSide === "left" ? paddingX : width - textZoneWidth - paddingX;

  const overlayX = textSide === "left" ? 0 : width - textZoneWidth - paddingX - width * 0.15;
  const overlayWidth = textZoneWidth + paddingX + width * 0.15;

  return {
    textZone: {
      x: textZoneX,
      y: paddingY,
      width: textZoneWidth - paddingX,
      height: height - paddingY * 2,
    },
    isOnSolidBackground: false,
    needsOverlay: true,
    overlayZone: {
      x: Math.max(0, overlayX),
      y: 0,
      width: Math.min(overlayWidth, width),
      height,
    },
    textSide,
    subjectStartX,
  };
}

/**
 * For portrait images: detect subject in lower area, place text above.
 */
async function detectPortraitZone(
  imagePath: string,
  width: number,
  height: number,
): Promise<TextZoneResult> {
  const { data } = await sharp(imagePath)
    .resize(64, 96, { fit: "fill" })
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  // 4x6 grid (6 rows)
  const gridCols = 4;
  const gridRows = 6;
  const cellW = 64 / gridCols;
  const cellH = 96 / gridRows;
  const channels = 4;

  const rowVariance: number[] = [];

  for (let row = 0; row < gridRows; row++) {
    let totalVariance = 0;
    for (let col = 0; col < gridCols; col++) {
      const pixels: number[] = [];
      for (let y = Math.floor(row * cellH); y < Math.floor((row + 1) * cellH); y++) {
        for (let x = Math.floor(col * cellW); x < Math.floor((col + 1) * cellW); x++) {
          const idx = (y * 64 + x) * channels;
          const gray = data[idx]! * 0.299 + data[idx + 1]! * 0.587 + data[idx + 2]! * 0.114;
          pixels.push(gray);
        }
      }
      const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
      const variance = pixels.reduce((a, b) => a + (b - mean) ** 2, 0) / pixels.length;
      totalVariance += variance;
    }
    rowVariance.push(totalVariance / gridCols);
  }

  // Find where variance significantly increases (subject edge)
  const avgVariance = rowVariance.reduce((a, b) => a + b, 0) / rowVariance.length;
  let subjectStartRow = gridRows; // default: bottom

  for (let row = 1; row < gridRows; row++) {
    if (rowVariance[row]! > avgVariance * 1.3) {
      subjectStartRow = row;
      break;
    }
  }

  // Convert row to pixel position
  const subjectStartY = (subjectStartRow / gridRows) * height;
  const minTextHeight = height * 0.25;

  const textZoneHeight = Math.max(subjectStartY - height * 0.1, minTextHeight);
  const paddingX = Math.floor(width * 0.06);

  return {
    textZone: {
      x: paddingX,
      y: Math.floor(height * 0.05),
      width: Math.floor(width * 0.88),
      height: Math.floor(textZoneHeight),
    },
    isOnSolidBackground: false,
    needsOverlay: true,
    overlayZone: {
      x: 0,
      y: 0,
      width,
      height: Math.floor(textZoneHeight + height * 0.25),
    },
    textSide: "top",
    subjectStartY: Math.round(subjectStartY),
  };
}

// --- Helpers ---

function sampleVerticalStrip(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  x: number,
): Array<{ r: number; g: number; b: number }> {
  const samples: Array<{ r: number; g: number; b: number }> = [];
  const step = Math.max(1, Math.floor(height / 50)); // ~50 samples
  for (let y = 0; y < height; y += step) {
    const idx = (y * width + x) * channels;
    samples.push({
      r: data[idx]!,
      g: data[idx + 1]!,
      b: data[idx + 2]!,
    });
  }
  return samples;
}

function isStripSolid(
  colors: Array<{ r: number; g: number; b: number }>,
): { isSolid: boolean; avgColor: { r: number; g: number; b: number }; stdDev: number } {
  if (colors.length === 0) return { isSolid: false, avgColor: { r: 0, g: 0, b: 0 }, stdDev: 999 };

  const avgR = colors.reduce((a, c) => a + c.r, 0) / colors.length;
  const avgG = colors.reduce((a, c) => a + c.g, 0) / colors.length;
  const avgB = colors.reduce((a, c) => a + c.b, 0) / colors.length;

  const variance = colors.reduce((a, c) => {
    return a + (c.r - avgR) ** 2 + (c.g - avgG) ** 2 + (c.b - avgB) ** 2;
  }, 0) / colors.length;

  const stdDev = Math.sqrt(variance / 3);

  return {
    isSolid: stdDev < 30,
    avgColor: { r: Math.round(avgR), g: Math.round(avgG), b: Math.round(avgB) },
    stdDev,
  };
}

function isColorClose(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  tolerance: number,
): boolean {
  return (
    Math.abs(a.r - b.r) <= tolerance &&
    Math.abs(a.g - b.g) <= tolerance &&
    Math.abs(a.b - b.b) <= tolerance
  );
}

function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function findPanelEdge(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  side: "left" | "right",
): number {
  // Binary search for the panel edge
  let lo = Math.floor(width * 0.1);
  let hi = Math.floor(width * 0.7);

  // Get reference color from the panel side
  const refX = side === "left" ? Math.floor(width * 0.05) : Math.floor(width * 0.95);
  const refColors = sampleVerticalStrip(data, width, height, channels, refX);
  const refSolid = isStripSolid(refColors);

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const testX = side === "left" ? mid : width - mid;
    const strip = sampleVerticalStrip(data, width, height, channels, testX);
    const solid = isStripSolid(strip);

    if (solid.isSolid && isColorClose(solid.avgColor, refSolid.avgColor, 40)) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
}
