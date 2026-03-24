import type { LayoutResult } from "../types.js";
import { renderBackground } from "./background-renderer.js";
import { renderOverlay } from "./overlay-renderer.js";
import { generateFontFaces } from "./font-loader.js";
import { renderBlock, renderLogo } from "./block-renderer.js";

/**
 * Builds a complete, self-contained HTML document from a LayoutResult.
 *
 * The HTML uses absolute positioning for every element — the layout resolver
 * has already computed exact pixel coordinates. All images and fonts are
 * embedded as base64 data URIs so no external resources are needed.
 *
 * Layer ordering:
 *   z-index 1: Background image
 *   z-index 2: Overlay (gradient/solid for text readability)
 *   z-index 10: Logo, stacked blocks, pinned blocks
 */
export async function buildHtml(layoutResult: LayoutResult): Promise<string> {
  const { canvas, theme, backgroundImage, textZone, overlay } = layoutResult;

  // Build all layers
  const [backgroundLayer, fontFaces, logoElement] = await Promise.all([
    renderBackground(backgroundImage, canvas, theme),
    generateFontFaces(theme),
    renderLogo(theme, canvas),
  ]);

  const overlayLayer = renderOverlay(overlay, textZone, canvas);

  // Render all blocks
  const stackedBlockElements = layoutResult.stackedBlocks
    .map((block) => renderBlock(block, theme))
    .join("\n");

  const pinnedBlockElements = layoutResult.pinnedBlocks
    .map((block) => renderBlock(block, theme))
    .join("\n");

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
  ${backgroundLayer}
  ${overlayLayer}
  ${logoElement}
  ${stackedBlockElements}
  ${pinnedBlockElements}
</body>
</html>`;
}
