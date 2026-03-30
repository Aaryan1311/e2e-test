import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Theme, ResolvedHeader, GradientConfig, Composition } from "../types/index.js";
import type { SizedField, SizingResult } from "./dynamic-sizer.js";
import type { TextZoneResult } from "./text-zone-detector.js";
import type { AnalyzedGradient } from "./gradient-analyzer.js";
import { generateFontFaces } from "./font-loader.js";
import { browserPool } from "./browser-pool.js";

/**
 * Composes the final image by rendering text fields onto the background image.
 * Returns both the PNG buffer and the HTML string (for debug).
 */
export async function compose(
  imagePath: string,
  imageWidth: number,
  imageHeight: number,
  textZoneResult: TextZoneResult,
  sizingResult: SizingResult,
  theme: Theme,
  headerConfig?: ResolvedHeader | null,
  gradientConfig?: GradientConfig,
  gradientColors?: AnalyzedGradient | null,
  composition?: Composition,
): Promise<{ imageBuffer: Buffer; html: string }> {
  const imageDataURI = await readImageAsBase64(imagePath);
  const fontFaceCSS = await generateFontFaces(theme);

  const html = buildHTML(
    imageDataURI,
    imageWidth,
    imageHeight,
    textZoneResult,
    sizingResult,
    theme,
    fontFaceCSS,
    headerConfig ?? null,
    gradientConfig,
    gradientColors ?? null,
    composition ?? "bottomRight",
  );

  const browser = await browserPool.acquire();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: imageWidth, height: imageHeight });
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 300));

    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
      clip: { x: 0, y: 0, width: imageWidth, height: imageHeight },
    });
    await page.close();
    return { imageBuffer: Buffer.from(screenshot), html };
  } finally {
    await browserPool.release(browser);
  }
}

async function readImageAsBase64(imagePath: string): Promise<string> {
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    const response = await fetch(imagePath);
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  }

  const absPath = resolve(process.cwd(), imagePath);
  const buffer = await readFile(absPath);

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
  headerConfig: ResolvedHeader | null,
  gradientConfig: GradientConfig | undefined,
  gradientColors: AnalyzedGradient | null,
  composition: Composition,
): string {
  const { textZone, isOnSolidBackground } = textZoneResult;
  const { fields, verticalOffset } = sizingResult;

  const overlayHTML = renderGradient(
    textZoneResult,
    width,
    height,
    gradientColors,
    gradientConfig,
    composition,
  );

  const headerHTML = headerConfig ? renderHeader(headerConfig, textZone) : "";

  let cumulativeY = 0;
  const fieldDivs = fields
    .map((field) => {
      const currentY = textZone.y + verticalOffset + cumulativeY;
      cumulativeY += field.estimatedHeight + field.gap;

      const style = getFieldStyle(field, theme, isOnSolidBackground);
      const content = renderFieldContent(field, theme, isOnSolidBackground);

      return `<div style="
        position: absolute;
        left: ${textZone.x}px;
        top: ${currentY}px;
        width: ${textZone.width}px;
        ${style}
        z-index: 10;
        overflow: hidden;
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
  <!-- Header -->
  ${headerHTML}
  <!-- Text fields -->
  ${fieldDivs}
</div>
</body>
</html>`;
}

function renderGradient(
  textZoneResult: TextZoneResult,
  imageWidth: number,
  imageHeight: number,
  gradientColors: AnalyzedGradient | null,
  gradientConfig: GradientConfig | undefined,
  composition: Composition,
): string {
  // halfAndHalf = no gradient at all
  if (composition === "halfAndHalf") return "";
  if (!textZoneResult.needsOverlay) return "";
  if (gradientConfig?.enabled === false) return "";

  const useCustomColor = gradientConfig?.color != null;
  const subjectBounds = textZoneResult.subjectBounds;

  if (composition === "bottomCenter") {
    // Vertical gradient from top down toward subject
    const gradientHeight = Math.round(subjectBounds.y - imageHeight * 0.05);
    let gradientCSS: string;

    if (useCustomColor) {
      const color = gradientConfig!.color!;
      gradientCSS = `linear-gradient(to bottom, ${color} 0%, ${color} 50%, transparent 85%)`;
    } else if (gradientColors) {
      const { topColor: tc, middleColor: mc, bottomColor: bc } = gradientColors;
      gradientCSS = `linear-gradient(to bottom,
        rgba(${tc.r}, ${tc.g}, ${tc.b}, 0.92) 0%,
        rgba(${mc.r}, ${mc.g}, ${mc.b}, 0.85) 50%,
        rgba(${bc.r}, ${bc.g}, ${bc.b}, 0.6) 75%,
        transparent 100%)`;
    } else {
      gradientCSS = `linear-gradient(to bottom, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.85) 50%, transparent 85%)`;
    }

    return `<div style="
      position: absolute;
      left: 0; top: 0;
      width: ${imageWidth}px;
      height: ${Math.max(gradientHeight, Math.round(imageHeight * 0.4))}px;
      background: ${gradientCSS};
      z-index: 2;
    "></div>`;
  }

  // bottomRight: horizontal gradient from left toward subject
  const gradientWidth = Math.round(subjectBounds.x + imageWidth * 0.10);
  let gradientCSS: string;

  if (useCustomColor) {
    const color = gradientConfig!.color!;
    const dir = gradientConfig?.direction ?? "to right";
    const endPct = gradientConfig?.width ?? Math.round((subjectBounds.x / imageWidth) * 100);
    gradientCSS = `linear-gradient(${dir}, ${color} 0%, ${color} ${endPct * 0.6}%, transparent ${endPct}%)`;
  } else if (gradientColors) {
    const { topColor: tc, middleColor: mc, bottomColor: bc } = gradientColors;
    gradientCSS = `linear-gradient(to right,
      rgba(${tc.r}, ${tc.g}, ${tc.b}, 0.92) 0%,
      rgba(${mc.r}, ${mc.g}, ${mc.b}, 0.88) 40%,
      rgba(${bc.r}, ${bc.g}, ${bc.b}, 0.75) 70%,
      transparent 100%)`;
  } else {
    gradientCSS = `linear-gradient(to right, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.88) 40%, transparent 100%)`;
  }

  return `<div style="
    position: absolute;
    left: 0; top: 0;
    width: ${Math.min(gradientWidth, imageWidth)}px;
    height: ${imageHeight}px;
    background: ${gradientCSS};
    z-index: 2;
  "></div>`;
}

function renderHeader(
  header: ResolvedHeader,
  textZone: { x: number; y: number; width: number },
): string {
  const logoHTML = header.logoBase64
    ? `<img src="${header.logoBase64}" width="${header.logoWidth}" height="${header.logoHeight}" style="flex-shrink: 0;" />`
    : "";

  const nameHTML = header.productName
    ? `<span style="
        font-family: '${header.productNameFontFamily}', sans-serif;
        font-size: ${header.productNameFontSize}px;
        font-weight: ${header.productNameFontWeight};
        color: ${header.productNameColor};
        line-height: 1.2;
      ">${escapeHTML(header.productName)}</span>`
    : "";

  if (!logoHTML && !nameHTML) return "";

  const headerTop = textZone.y - header.totalHeight + header.paddingTop;

  return `<div style="
    position: absolute;
    left: ${header.paddingLeft}px;
    top: ${Math.max(headerTop, textZone.y - header.totalHeight)}px;
    width: ${textZone.width}px;
    display: flex;
    align-items: center;
    gap: ${header.gap}px;
    z-index: 10;
    padding-top: ${header.paddingTop}px;
  ">${logoHTML}${nameHTML}</div>`;
}

function getFieldStyle(
  field: SizedField,
  theme: Theme,
  isOnSolid: boolean,
): string {
  const rule = field.rule;
  const fontConfig = theme.fonts[rule.fontKey];
  const overrides = field.overrides;

  const fontFamily = overrides?.fontFamily ?? fontConfig.family;
  const fontWeight = overrides?.fontWeight ?? fontConfig.weight;
  const fontStyle = overrides?.fontStyle ?? fontConfig.style;
  const letterSpacing = overrides?.letterSpacing ?? "0px";
  const textTransform = overrides?.textTransform ?? rule.textTransform ?? "none";
  const textAlign = overrides?.textAlign ?? "left";
  const opacity = overrides?.opacity ?? 1;

  let color: string;
  if (overrides?.color) {
    color = overrides.color;
  } else if (isOnSolid) {
    color = theme.colors.onPrimary;
  } else {
    const colorKey = rule.colorKey as keyof typeof theme.colors;
    color = theme.colors[colorKey] ?? theme.colors.body;
  }

  return `
    font-family: '${fontFamily}', sans-serif;
    font-size: ${field.fontSize}px;
    font-weight: ${fontWeight};
    font-style: ${fontStyle};
    line-height: ${field.lineHeight}px;
    color: ${color};
    letter-spacing: ${letterSpacing};
    text-transform: ${textTransform};
    text-align: ${textAlign};
    opacity: ${opacity};
  `;
}

function renderFieldContent(
  field: SizedField,
  theme: Theme,
  isOnSolid: boolean,
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
      const overrideColor = field.overrides?.color;
      return `<div style="
        display: inline-block;
        padding: ${Math.round(field.fontSize * 0.3)}px ${Math.round(field.fontSize * 0.8)}px;
        background-color: ${bgColor};
        color: ${overrideColor ?? fgColor};
        border-radius: 4px;
        font-weight: 700;
      ">${escapeHTML(field.content)}</div>`;
    }

    case "disclaimer":
      return `<span style="opacity: 0.7;">${escapeHTML(field.content)}</span>`;

    default:
      return escapeSafe(field.content);
  }
}

function escapeSafe(text: string): string {
  const parts = text.split(/<br\s*\/?>/gi);
  return parts.map(escapeHTML).join("<br>");
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
