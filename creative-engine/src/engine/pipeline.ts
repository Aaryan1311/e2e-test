import sharp from "sharp";
import type { RenderRequest, RenderResult } from "../types/index.js";
import { getTheme } from "../config/themes.js";
import { detectTextZone } from "./text-zone-detector.js";
import { calculateSizes } from "./dynamic-sizer.js";
import { compose, composeHTML } from "./composer.js";

/**
 * Main render pipeline: image in → image out.
 */
export async function render(request: RenderRequest): Promise<RenderResult> {
  const startTime = Date.now();

  // 1. Load theme
  const theme = getTheme(request.theme);
  console.log(`[Engine] Theme: ${theme.displayName}`);

  // 2. Read image dimensions
  const metadata = await sharp(request.image).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Cannot read image dimensions: ${request.image}`);
  }
  const { width, height } = metadata;
  console.log(`[Engine] Image: ${width}x${height}`);

  // 3. Detect text zone
  const textZoneResult = await detectTextZone(
    request.image,
    request.imageType,
    theme,
  );
  console.log(
    `[Engine] Text zone: ${textZoneResult.textZone.width}x${textZoneResult.textZone.height} at (${textZoneResult.textZone.x}, ${textZoneResult.textZone.y}), onSolid: ${textZoneResult.isOnSolidBackground}`,
  );

  // 4. Calculate dynamic sizes
  const sizingResult = calculateSizes(request.fields, textZoneResult.textZone);
  console.log(
    `[Engine] Base font size: ${sizingResult.baseFontSize}px, fields: ${sizingResult.fields.length}, total height: ${sizingResult.totalContentHeight}px / ${textZoneResult.textZone.height}px available`,
  );

  // 5. Compose final image
  const imageBuffer = await compose(
    request.image,
    width,
    height,
    textZoneResult,
    sizingResult,
    theme,
  );

  const duration = Date.now() - startTime;
  console.log(`[Engine] Render complete (${duration}ms)`);

  // Build y positions for field sizes metadata
  let cumulativeY = textZoneResult.textZone.y + sizingResult.verticalOffset;
  const fieldSizes = sizingResult.fields.map((f) => {
    const y = cumulativeY;
    cumulativeY += f.estimatedHeight + f.gap;
    return {
      type: f.type,
      fontSize: f.fontSize,
      lineHeight: f.lineHeight,
      y,
    };
  });

  return {
    imageBuffer,
    width,
    height,
    textZone: textZoneResult.textZone,
    fieldSizes,
  };
}

/**
 * Preview pipeline: returns HTML string for debugging.
 */
export async function preview(request: RenderRequest): Promise<string> {
  const theme = getTheme(request.theme);
  const metadata = await sharp(request.image).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Cannot read image dimensions: ${request.image}`);
  }

  const textZoneResult = await detectTextZone(
    request.image,
    request.imageType,
    theme,
  );
  const sizingResult = calculateSizes(request.fields, textZoneResult.textZone);

  return composeHTML(
    request.image,
    metadata.width,
    metadata.height,
    textZoneResult,
    sizingResult,
    theme,
  );
}
