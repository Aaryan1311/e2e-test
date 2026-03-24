import type { LayoutResult } from "../types.js";
import { renderBackground } from "./background-renderer.js";
import { renderOverlay } from "./overlay-renderer.js";
import { generateFontFaces } from "./font-loader.js";
import { renderBlock, renderLogo } from "./block-renderer.js";
import { renderInfinityBridge } from "./infinity-bridge-renderer.js";

/**
 * Builds a complete, self-contained HTML document from a LayoutResult.
 *
 * The HTML uses absolute positioning for every element — the layout resolver
 * has already computed exact pixel coordinates. All images and fonts are
 * embedded as base64 data URIs so no external resources are needed.
 *
 * Supports three layout modes:
 * - "split": Content panel + image panel side by side
 * - "image-overlay": Full-bleed background with gradient overlay
 * - "image-forward": Full-bleed background, minimal text (pinned only)
 */
export async function buildHtml(layoutResult: LayoutResult): Promise<string> {
  const { canvas, theme, backgroundImage, layoutMode, layoutConfig } = layoutResult;
  const mode = layoutMode ?? "image-overlay";

  const fontFaces = await generateFontFaces(theme);
  const logoElement = await renderLogo(theme, canvas);

  // Render all blocks
  const stackedBlockElements = layoutResult.stackedBlocks
    .map((block) => renderBlock(block, theme))
    .join("\n");

  const pinnedBlockElements = layoutResult.pinnedBlocks
    .map((block) => renderBlock(block, theme))
    .join("\n");

  let bodyContent: string;

  if (mode === "split" && layoutConfig?.contentPanel && layoutConfig?.imagePanel) {
    // Split mode: content panel + image panel
    const cp = layoutConfig.contentPanel;
    const ip = layoutConfig.imagePanel;

    const [imagePanelBg] = await Promise.all([
      renderBackground(backgroundImage, {
        ...canvas,
        width: ip.width,
        height: ip.height,
      }, theme),
    ]);

    // Replace the background position to be within the image panel
    const imagePanelHtml = imagePanelBg.replace(
      /left:\s*0/,
      `left: ${ip.x}`
    ).replace(
      new RegExp(`width:\\s*${ip.width}px`),
      `width: ${ip.width}px`
    );

    const bridgeHtml = renderInfinityBridge(layoutConfig.infinityBridge);

    bodyContent = `
  <!-- Content Panel -->
  <div style="
    position: absolute;
    left: ${cp.x}px; top: 0;
    width: ${cp.width}px; height: ${canvas.height}px;
    background-color: ${cp.backgroundColor};
    z-index: 1;
  "></div>

  <!-- Image Panel -->
  <div style="
    position: absolute;
    left: ${ip.x}px; top: 0;
    width: ${ip.width}px; height: ${ip.height}px;
    overflow: hidden;
    z-index: 1;
  ">
    ${imagePanelBg.replace(/position:\s*absolute;\s*top:\s*0;\s*left:\s*0/, 'position: absolute; top: 0; left: 0').replace(new RegExp(`width:\\s*\\d+px`), `width: ${ip.width}px`).replace(new RegExp(`height:\\s*\\d+px`), `height: ${ip.height}px`)}
  </div>

  ${bridgeHtml}
  ${logoElement}
  ${stackedBlockElements}
  ${pinnedBlockElements}`;

  } else if (mode === "image-forward") {
    // Image-forward mode: full-bleed image, only pinned blocks
    const [backgroundLayer] = await Promise.all([
      renderBackground(backgroundImage, canvas, theme),
    ]);

    bodyContent = `
  ${backgroundLayer}
  ${logoElement}
  ${pinnedBlockElements}`;

  } else {
    // Image-overlay mode (default/existing behavior)
    const [backgroundLayer] = await Promise.all([
      renderBackground(backgroundImage, canvas, theme),
    ]);
    const overlayLayer = renderOverlay(layoutResult.overlay, layoutResult.textZone, canvas);

    bodyContent = `
  ${backgroundLayer}
  ${overlayLayer}
  ${logoElement}
  ${stackedBlockElements}
  ${pinnedBlockElements}`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${canvas.width}px;
      height: ${canvas.height}px;
      overflow: hidden;
      position: relative;
    }
    ${fontFaces}
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}
