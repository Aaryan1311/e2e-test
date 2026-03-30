import sharp from "sharp";
import type { Composition, BoundingBox, Theme } from "../types/index.js";

export interface TextZoneResult {
  textZone: BoundingBox;
  isOnSolidBackground: boolean;
  solidBackgroundColor?: string;
  needsOverlay: boolean;
  subjectBounds: BoundingBox;
}

/**
 * Detects where text should be placed on the image based on composition type.
 */
export async function detectTextZone(
  imagePath: string,
  composition: Composition,
  theme: Theme,
): Promise<TextZoneResult> {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  switch (composition) {
    case "bottomRight":
      return detectBottomRight(imagePath, width, height);
    case "bottomCenter":
      return detectBottomCenter(imagePath, width, height);
    case "halfAndHalf":
      return detectHalfAndHalf(imagePath, width, height, theme);
  }
}

/**
 * bottomRight: Subject in bottom-right, text in top-left.
 * Uses a 6x6 grid variance analysis to find where the subject starts.
 */
async function detectBottomRight(
  imagePath: string,
  width: number,
  height: number,
): Promise<TextZoneResult> {
  const gridSize = 6;
  const thumbW = gridSize * 16; // 96px
  const thumbH = gridSize * 16;

  const { data } = await sharp(imagePath)
    .resize(thumbW, thumbH, { fit: "fill" })
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const channels = 4;
  const cellW = thumbW / gridSize;
  const cellH = thumbH / gridSize;

  // Calculate variance for each cell
  const cellVariance: number[][] = [];
  for (let row = 0; row < gridSize; row++) {
    cellVariance[row] = [];
    for (let col = 0; col < gridSize; col++) {
      const pixels: number[] = [];
      for (let y = Math.floor(row * cellH); y < Math.floor((row + 1) * cellH); y++) {
        for (let x = Math.floor(col * cellW); x < Math.floor((col + 1) * cellW); x++) {
          const idx = (y * thumbW + x) * channels;
          const gray = data[idx]! * 0.299 + data[idx + 1]! * 0.587 + data[idx + 2]! * 0.114;
          pixels.push(gray);
        }
      }
      const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
      const variance = pixels.reduce((a, b) => a + (b - mean) ** 2, 0) / pixels.length;
      cellVariance[row]![col] = variance;
    }
  }

  // Find average variance to use as threshold
  let totalVar = 0;
  let cellCount = 0;
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      totalVar += cellVariance[row]![col]!;
      cellCount++;
    }
  }
  const avgVariance = totalVar / cellCount;
  const threshold = avgVariance * 1.2;

  // Find leftmost column where bottom rows have high variance (subject edge)
  let subjectLeftCol = gridSize;
  for (let col = 0; col < gridSize; col++) {
    // Check bottom half of this column
    let highCount = 0;
    for (let row = Math.floor(gridSize / 2); row < gridSize; row++) {
      if (cellVariance[row]![col]! > threshold) highCount++;
    }
    if (highCount >= Math.floor(gridSize / 4)) {
      subjectLeftCol = col;
      break;
    }
  }

  // Find topmost row where right cols have high variance
  let subjectTopRow = gridSize;
  for (let row = 0; row < gridSize; row++) {
    let highCount = 0;
    for (let col = Math.floor(gridSize / 2); col < gridSize; col++) {
      if (cellVariance[row]![col]! > threshold) highCount++;
    }
    if (highCount >= Math.floor(gridSize / 4)) {
      subjectTopRow = row;
      break;
    }
  }

  const subjectLeftEdge = Math.round((subjectLeftCol / gridSize) * width);
  const subjectTopEdge = Math.round((subjectTopRow / gridSize) * height);

  const subjectBounds: BoundingBox = {
    x: subjectLeftEdge,
    y: subjectTopEdge,
    width: width - subjectLeftEdge,
    height: height - subjectTopEdge,
  };

  const padding = Math.round(width * 0.05);
  const buffer = Math.round(width * 0.05);

  let textZoneWidth = subjectLeftEdge - padding * 2 - buffer;
  textZoneWidth = Math.max(textZoneWidth, Math.round(width * 0.30));
  textZoneWidth = Math.min(textZoneWidth, Math.round(width * 0.60));

  const textZone: BoundingBox = {
    x: padding,
    y: padding,
    width: textZoneWidth,
    height: height - padding * 2,
  };

  return {
    textZone,
    isOnSolidBackground: false,
    needsOverlay: true,
    subjectBounds,
  };
}

/**
 * bottomCenter: Subject centered in lower portion, text at top full-width.
 * Scans 8 horizontal bands to find where subject variance spikes.
 */
async function detectBottomCenter(
  imagePath: string,
  width: number,
  height: number,
): Promise<TextZoneResult> {
  const bandCount = 8;
  const thumbW = 64;
  const thumbH = bandCount * 16; // 128px

  const { data } = await sharp(imagePath)
    .resize(thumbW, thumbH, { fit: "fill" })
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const channels = 4;
  const bandH = thumbH / bandCount;
  const bandVariances: number[] = [];

  for (let band = 0; band < bandCount; band++) {
    const pixels: number[] = [];
    for (let y = Math.floor(band * bandH); y < Math.floor((band + 1) * bandH); y++) {
      for (let x = 0; x < thumbW; x++) {
        const idx = (y * thumbW + x) * channels;
        const gray = data[idx]! * 0.299 + data[idx + 1]! * 0.587 + data[idx + 2]! * 0.114;
        pixels.push(gray);
      }
    }
    const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
    const variance = pixels.reduce((a, b) => a + (b - mean) ** 2, 0) / pixels.length;
    bandVariances.push(variance);
  }

  // Find where variance jumps significantly (subject starts)
  let subjectBand = bandCount; // default: bottom
  for (let i = 1; i < bandCount; i++) {
    const prev = bandVariances[i - 1]!;
    const curr = bandVariances[i]!;
    if (prev > 0 && curr > prev * 2) {
      subjectBand = i;
      break;
    }
  }

  // Fallback: if no significant jump found, use average-based threshold
  if (subjectBand === bandCount) {
    const avgVar = bandVariances.reduce((a, b) => a + b, 0) / bandCount;
    for (let i = 1; i < bandCount; i++) {
      if (bandVariances[i]! > avgVar * 1.3) {
        subjectBand = i;
        break;
      }
    }
  }

  const subjectTopEdge = Math.round((subjectBand / bandCount) * height);

  const subjectBounds: BoundingBox = {
    x: 0,
    y: subjectTopEdge,
    width,
    height: height - subjectTopEdge,
  };

  const paddingX = Math.round(width * 0.06);
  const paddingTop = Math.round(height * 0.04);
  const buffer = Math.round(height * 0.10);

  let textZoneBottom = subjectTopEdge - buffer;
  // Minimum text zone height: 20% of image
  if (textZoneBottom - paddingTop < height * 0.20) {
    textZoneBottom = paddingTop + Math.round(height * 0.20);
  }

  const textZone: BoundingBox = {
    x: paddingX,
    y: paddingTop,
    width: width - paddingX * 2,
    height: textZoneBottom - paddingTop,
  };

  return {
    textZone,
    isOnSolidBackground: false,
    needsOverlay: true,
    subjectBounds,
  };
}

/**
 * halfAndHalf: Pre-split image with a solid color panel.
 * Detects the panel and uses it as text zone. No gradient.
 */
async function detectHalfAndHalf(
  imagePath: string,
  width: number,
  height: number,
  theme: Theme,
): Promise<TextZoneResult> {
  const { data } = await sharp(imagePath)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const channels = 4;

  // Sample vertical strips near left and right edges
  const leftX = Math.floor(width * 0.02);
  const rightX = Math.floor(width * 0.98);

  const leftColors = sampleVerticalStrip(data, width, height, channels, leftX);
  const rightColors = sampleVerticalStrip(data, width, height, channels, rightX);

  const leftSolid = isStripSolid(leftColors);
  const rightSolid = isStripSolid(rightColors);

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
    // Fallback: treat left 45% as text zone
    console.warn("[TextZoneDetector] No solid panel detected, using left 45% fallback");
    const padding = Math.round(width * 0.06);
    return {
      textZone: {
        x: padding,
        y: Math.round(height * 0.08),
        width: Math.round(width * 0.45) - padding * 2,
        height: Math.round(height * 0.84),
      },
      isOnSolidBackground: false,
      needsOverlay: true,
      subjectBounds: {
        x: Math.round(width * 0.45),
        y: 0,
        width: Math.round(width * 0.55),
        height,
      },
    };
  }

  // Binary search for panel edge
  const panelWidth = findPanelEdge(data, width, height, channels, panelSide);
  const padding = Math.round(panelWidth * 0.08);
  const panelX = panelSide === "left" ? 0 : width - panelWidth;

  const colorHex = detectedColor
    ? `#${detectedColor.r.toString(16).padStart(2, "0")}${detectedColor.g.toString(16).padStart(2, "0")}${detectedColor.b.toString(16).padStart(2, "0")}`
    : theme.colors.primary;

  // Subject bounds = the photo side (non-panel)
  const subjectX = panelSide === "left" ? panelWidth : 0;
  const subjectW = width - panelWidth;

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
    subjectBounds: {
      x: subjectX,
      y: 0,
      width: subjectW,
      height,
    },
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
  const step = Math.max(1, Math.floor(height / 50));
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
  let lo = Math.floor(width * 0.1);
  let hi = Math.floor(width * 0.7);

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
