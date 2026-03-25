import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import type { Theme, FontConfig } from "../types/index.js";
import type { SizedField, SizingResult } from "./dynamic-sizer.js";
import type { TextZoneResult } from "./text-zone-detector.js";
import { generateFontFaces } from "./font-loader.js";
import { browserPool } from "./browser-pool.js";

/**
 * Composes the final image by rendering text fields onto the background image.
 * Uses HTML + Puppeteer for pixel-perfect text rendering.
 */
export async function compose(
  imagePath: string,
  imageWidth: number,
  imageHeight: number,
  textZoneResult: TextZoneResult,
  sizingResult: SizingResult,
  theme: Theme,
): Promise<Buffer> {
  // 1. Read background image as base64
  const imageBuffer = await readImageAsBase64(imagePath);

  // 2. Generate font faces
  const fontFaceCSS = await generateFontFaces(theme);

  // 3. Build HTML
  const html = buildHTML(
    imageBuffer,
    imageWidth,
    imageHeight,
    textZoneResult,
    sizingResult,
    theme,
    fontFaceCSS,
  );

  // 4. Screenshot with Puppeteer
  const browser = await browserPool.acquire();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: imageWidth, height: imageHeight });
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    // Brief wait for font rendering
    await new Promise((r) => setTimeout(r, 300));

    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
      clip: { x: 0, y: 0, width: imageWidth, height: imageHeight },
    });
    await page.close();
    return Buffer.from(screenshot);
  } finally {
    await browserPool.release(browser);
  }
}

/**
 * Generates the HTML string without taking a screenshot (for preview/debugging).
 */
export async function composeHTML(
  imagePath: string,
  imageWidth: number,
  imageHeight: number,
  textZoneResult: TextZoneResult,
  sizingResult: SizingResult,
  theme: Theme,
): Promise<string> {
  const imageBuffer = await readImageAsBase64(imagePath);
  const fontFaceCSS = await generateFontFaces(theme);

  return buildHTML(
    imageBuffer,
    imageWidth,
    imageHeight,
    textZoneResult,
    sizingResult,
    theme,
    fontFaceCSS,
  );
}

async function readImageAsBase64(imagePath: string): Promise<string> {
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    // For remote URLs, fetch and convert
    const response = await fetch(imagePath);
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  }

  const absPath = resolve(process.cwd(), imagePath);
  const buffer = await readFile(absPath);

  // Detect format from buffer magic bytes
  let mime = "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8) mime = "image/jpeg";
  else if (buffer[0] === 0x89 && buffer[1] === 0x50) mime = "image/png";

  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function buildHTML(
  imageDataURI: string,
  width: number,
  height: number,
  textZoneResult: TextZoneResult,
  sizingResult: SizingResult,
  theme: Theme,
  fontFaceCSS: string,
): string {
  const { textZone, isOnSolidBackground, needsOverlay, overlayZone, textSide } =
    textZoneResult;
  const { fields, verticalOffset } = sizingResult;

  // Build overlay HTML
  let overlayHTML = "";
  if (needsOverlay && overlayZone) {
    let gradientDir = "to right";
    if (textSide === "right") gradientDir = "to left";
    if (textSide === "top") gradientDir = "to bottom";

    overlayHTML = `<div style="
      position: absolute;
      left: ${overlayZone.x}px;
      top: ${overlayZone.y}px;
      width: ${overlayZone.width}px;
      height: ${overlayZone.height}px;
      background: linear-gradient(
        ${gradientDir},
        ${theme.colors.overlay} 0%,
        ${theme.colors.overlay} 60%,
        transparent 100%
      );
      z-index: 2;
    "></div>`;
  }

  // Build field HTML
  let cumulativeY = 0;
  const fieldDivs = fields
    .map((field) => {
      const currentY = textZone.y + verticalOffset + cumulativeY;
      cumulativeY += field.estimatedHeight + field.gap;

      const fontConfig = theme.fonts[field.rule.fontKey];
      const textColor = getTextColor(field, theme, isOnSolidBackground);
      const content = renderFieldContent(field, theme, isOnSolidBackground, fontConfig);

      return `<div style="
        position: absolute;
        left: ${textZone.x}px;
        top: ${currentY}px;
        width: ${textZone.width}px;
        font-family: '${fontConfig.family}', sans-serif;
        font-size: ${field.fontSize}px;
        font-weight: ${fontConfig.weight};
        font-style: ${fontConfig.style};
        line-height: ${field.lineHeight}px;
        color: ${textColor};
        z-index: 10;
        overflow: hidden;
        ${field.rule.textTransform ? `text-transform: ${field.rule.textTransform};` : ""}
      ">${content}</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${fontFaceCSS}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: ${width}px; height: ${height}px; overflow: hidden; }
</style>
</head>
<body>
<div style="position: relative; width: ${width}px; height: ${height}px; overflow: hidden;">
  <!-- Background image -->
  <img src="${imageDataURI}" style="
    position: absolute; left: 0; top: 0;
    width: ${width}px; height: ${height}px;
    object-fit: cover; z-index: 1;
  " />
  <!-- Overlay -->
  ${overlayHTML}
  <!-- Text fields -->
  ${fieldDivs}
</div>
</body>
</html>`;
}

function getTextColor(
  field: SizedField,
  theme: Theme,
  isOnSolid: boolean,
): string {
  if (isOnSolid) return theme.colors.onPrimary;

  const colorKey = field.rule.colorKey as keyof typeof theme.colors;
  return theme.colors[colorKey] ?? theme.colors.body;
}

function renderFieldContent(
  field: SizedField,
  theme: Theme,
  isOnSolid: boolean,
  fontConfig: FontConfig,
): string {
  switch (field.type) {
    case "bullets": {
      const items = field.items && field.items.length > 0
        ? field.items
        : field.content.split("\n").filter((s) => s.trim());
      const lis = items
        .map((item) => `<li style="margin-bottom: ${Math.round(field.fontSize * 0.15)}px;">${escapeHTML(item)}</li>`)
        .join("");
      return `<ul style="padding-left: ${Math.round(field.fontSize * 1.2)}px; list-style-type: disc;">${lis}</ul>`;
    }

    case "cta": {
      const bgColor = isOnSolid ? theme.colors.onPrimary : theme.colors.primary;
      const fgColor = isOnSolid ? theme.colors.primary : theme.colors.onPrimary;
      return `<div style="
        display: inline-block;
        padding: ${Math.round(field.fontSize * 0.3)}px ${Math.round(field.fontSize * 0.8)}px;
        background-color: ${bgColor};
        color: ${fgColor};
        border-radius: 4px;
        font-weight: 700;
      ">${escapeHTML(field.content)}</div>`;
    }

    case "disclaimer":
      return `<span style="opacity: 0.7;">${escapeHTML(field.content)}</span>`;

    default:
      return escapeHTML(field.content);
  }
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
