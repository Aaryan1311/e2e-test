import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import type { CanvasDefinition, ThemeDefinition } from "../../types/index.js";
import type { PositionedBlock } from "../types.js";

/**
 * Escapes HTML special characters to prevent XSS in rendered content.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Generates the inner content HTML based on block type.
 */
function renderInnerContent(block: PositionedBlock, theme: ThemeDefinition): string {
  const tag = block.definition.htmlTag;
  const content = escapeHtml(block.content);
  const accentColor = theme.colors.accent ?? theme.colors.primary;

  switch (block.type) {
    case "heading":
    case "subheading":
    case "offer-line":
    case "solution-line":
    case "contact-line":
      return `<${tag} style="margin: 0; font: inherit; color: inherit;">${content}</${tag}>`;

    case "bullets": {
      const items = block.items && block.items.length > 0
        ? block.items
        : block.content.split("\n").filter((l) => l.trim());
      const lis = items
        .map((item) => `<li style="margin-bottom: 4px;">${escapeHtml(item)}</li>`)
        .join("");
      return `<ul style="margin: 0; padding-left: 20px; list-style-type: disc; color: ${accentColor};">
        ${lis}
      </ul>`;
    }

    case "cta":
      return `<div style="
        display: inline-block;
        padding: ${block.resolvedStyles.padding};
        background-color: ${block.resolvedStyles.backgroundColor};
        color: ${block.resolvedStyles.color};
        border-radius: ${block.resolvedStyles.borderRadius};
        font-weight: ${block.resolvedStyles.fontWeight};
        text-align: center;
        cursor: default;
        font-size: inherit;
        font-family: inherit;
        letter-spacing: ${block.resolvedStyles.letterSpacing};
        text-transform: ${block.resolvedStyles.textTransform};
      ">${content}</div>`;

    case "brand-divider": {
      // Check if content is an image path
      if (block.content && /\.(png|svg|jpg|jpeg|gif)$/i.test(block.content)) {
        return `<img src="${escapeHtml(block.content)}" style="height: 100%; object-fit: contain;" alt="divider" />`;
      }
      return `<div style="
        width: 60px;
        height: 2px;
        background-color: ${accentColor};
      "></div>`;
    }

    case "disclaimer":
      return `<div style="
        background-color: ${block.resolvedStyles.backgroundColor};
        padding: ${block.resolvedStyles.padding};
        width: 100%;
        box-sizing: border-box;
      ">
        <p style="font-size: ${block.scaledFontSize ?? block.resolvedStyles.fontSize}; color: ${block.resolvedStyles.color}; margin: 0; font-family: inherit;">
          ${content}
        </p>
      </div>`;

    default:
      return `<div>${content}</div>`;
  }

}

/**
 * Determines vertical alignment CSS for the block's flex container.
 */
function getVerticalAlignment(block: PositionedBlock): string {
  if (block.type === "cta") return "center";
  if (block.type === "disclaimer") return "center";
  return "flex-start";
}

/**
 * Converts a PositionedBlock into an absolutely positioned HTML div string.
 *
 * Each block is placed at its exact pixel coordinates from the layout resolver.
 * The z-index is 10 for all content blocks (above background and overlay).
 */
export function renderBlock(block: PositionedBlock, theme: ThemeDefinition): string {
  const s = block.resolvedStyles;
  const fontSize = block.scaledFontSize ?? s.fontSize;
  const vertAlign = getVerticalAlignment(block);
  const innerContent = renderInnerContent(block, theme);

  return `<div style="
    position: absolute;
    left: ${block.bounds.x}px;
    top: ${block.bounds.y}px;
    width: ${block.bounds.width}px;
    height: ${block.bounds.height}px;
    font-family: '${s.fontFamily}', Arial, sans-serif;
    font-size: ${fontSize};
    font-weight: ${s.fontWeight};
    font-style: ${s.fontStyle};
    line-height: ${s.lineHeight};
    letter-spacing: ${s.letterSpacing};
    color: ${s.color};
    text-align: ${s.textAlign};
    text-transform: ${s.textTransform};
    opacity: ${s.opacity};
    overflow: hidden;
    z-index: 10;
    box-sizing: border-box;
    display: flex;
    align-items: ${vertAlign};
  ">
    ${innerContent}
  </div>`;
}

/**
 * Renders the theme logo as an absolutely positioned image element.
 *
 * Reads the logo file from assets/logos/, converts to base64 data URI.
 * Falls back to an empty string if logo file is not found.
 */
export async function renderLogo(theme: ThemeDefinition, canvas: CanvasDefinition): Promise<string> {
  const logoPath = resolve(process.cwd(), "assets", "logos", theme.logo.src);
  let logoSrc = "";

  if (existsSync(logoPath)) {
    try {
      const buffer = await readFile(logoPath);
      const ext = theme.logo.src.split(".").pop()?.toLowerCase() ?? "png";
      const mime = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
      logoSrc = `data:${mime};base64,${buffer.toString("base64")}`;
    } catch (error) {
      console.warn(`[HTMLBuilder] Failed to read logo: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    console.warn(`[HTMLBuilder] Logo file not found: ${logoPath}`);
  }

  if (!logoSrc) {
    return "";
  }

  // Calculate position based on theme.layout.logoPosition
  const padding = parseFloat(theme.layout.contentPadding) || 40;
  const width = parseFloat(theme.logo.width) || 120;
  const height = theme.logo.height ? parseFloat(theme.logo.height) : width * 0.33;

  let x: number;
  let y: number;

  switch (theme.layout.logoPosition) {
    case "top-left":
      x = padding;
      y = padding;
      break;
    case "top-right":
      x = canvas.width - width - padding;
      y = padding;
      break;
    case "top-center":
      x = Math.round((canvas.width - width) / 2);
      y = padding;
      break;
    case "bottom-left":
      x = padding;
      y = canvas.height - height - padding;
      break;
    case "bottom-right":
      x = canvas.width - width - padding;
      y = canvas.height - height - padding;
      break;
    case "bottom-center":
      x = Math.round((canvas.width - width) / 2);
      y = canvas.height - height - padding;
      break;
    default:
      x = padding;
      y = padding;
      break;
  }

  return `<img src="${logoSrc}" style="
    position: absolute;
    left: ${Math.round(x)}px;
    top: ${Math.round(y)}px;
    width: ${Math.round(width)}px;
    height: ${Math.round(height)}px;
    object-fit: contain;
    z-index: 10;
  " alt="logo" />`;
}
