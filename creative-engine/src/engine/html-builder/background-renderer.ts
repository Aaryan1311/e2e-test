import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { CanvasDefinition, ThemeDefinition } from "../../types/index.js";

/**
 * Converts a local image file to a base64 data URI using sharp.
 * Falls back to direct file read if sharp fails.
 */
async function imageToBase64(filePath: string): Promise<string> {
  const buffer = await sharp(filePath).jpeg({ quality: 90 }).toBuffer();
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

/**
 * Generates the background image layer HTML.
 *
 * - Local files are embedded as base64 data URIs for self-contained HTML.
 * - Remote URLs are fetched and embedded as base64 with a 10s timeout.
 * - Empty/invalid paths fall back to a solid color from the theme.
 */
export async function renderBackground(
  backgroundImage: string,
  canvas: CanvasDefinition,
  theme: ThemeDefinition
): Promise<string> {
  const baseStyle = `
    position: absolute;
    top: 0; left: 0;
    width: ${canvas.width}px;
    height: ${canvas.height}px;
    background-size: cover;
    background-position: center;
    z-index: 1;
  `.trim();

  // Empty or missing background → solid color fallback
  if (!backgroundImage || backgroundImage.trim() === "") {
    console.warn("[HTMLBuilder] No background image provided, using solid color fallback");
    return `<div style="${baseStyle}; background-color: ${theme.colors.primary};"></div>`;
  }

  // Local file path
  if (backgroundImage.startsWith("/") || backgroundImage.startsWith("./") || backgroundImage.startsWith("../")) {
    try {
      if (!existsSync(backgroundImage)) {
        console.warn(`[HTMLBuilder] Background image not found: ${backgroundImage}, using solid color`);
        return `<div style="${baseStyle}; background-color: ${theme.colors.primary};"></div>`;
      }
      const dataUri = await imageToBase64(backgroundImage);
      return `<div style="${baseStyle}; background-image: url('${dataUri}');"></div>`;
    } catch (error) {
      console.warn(`[HTMLBuilder] Failed to read background image: ${error instanceof Error ? error.message : String(error)}`);
      return `<div style="${baseStyle}; background-color: ${theme.colors.primary};"></div>`;
    }
  }

  // Remote URL
  if (backgroundImage.startsWith("http://") || backgroundImage.startsWith("https://")) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(backgroundImage, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = await sharp(Buffer.from(arrayBuffer)).jpeg({ quality: 90 }).toBuffer();
      const dataUri = `data:image/jpeg;base64,${buffer.toString("base64")}`;
      return `<div style="${baseStyle}; background-image: url('${dataUri}');"></div>`;
    } catch (error) {
      console.warn(`[HTMLBuilder] Failed to fetch remote background: ${error instanceof Error ? error.message : String(error)}`);
      return `<div style="${baseStyle}; background-color: ${theme.colors.primary};"></div>`;
    }
  }

  // Unrecognized format → solid color
  console.warn(`[HTMLBuilder] Unrecognized background image format: ${backgroundImage}`);
  return `<div style="${baseStyle}; background-color: ${theme.colors.primary};"></div>`;
}
