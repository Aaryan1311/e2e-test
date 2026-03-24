import { RenderRequestSchema } from "../types/index.js";
import type { RenderRequest, RenderResult } from "../types/index.js";
import { getTheme } from "../config/themes/index.js";
import { getCanvas } from "../config/canvases.js";
import { analyzeSpatial } from "./spatial-analyzer/index.js";
import { resolveLayout } from "./layout-resolver/index.js";
import { buildHtml } from "./html-builder/index.js";
import { renderToImage } from "./renderer/index.js";

/**
 * End-to-end pipeline: takes a raw RenderRequest and produces final PNG images.
 *
 * Steps per aspect ratio:
 * 1. Validate request via Zod schema
 * 2. Load theme and canvas configs
 * 3. Run spatial analysis on the background image
 * 4. Resolve layout (block positions)
 * 5. Build self-contained HTML
 * 6. Render to PNG via Puppeteer
 *
 * Multiple aspect ratios are rendered concurrently.
 * If one ratio fails, successful ones are still returned.
 */
export async function generateCreatives(
  request: RenderRequest
): Promise<RenderResult[]> {
  const totalStart = performance.now();

  // Validate request
  const parsed = RenderRequestSchema.safeParse(request);
  if (!parsed.success) {
    throw new Error(`[Pipeline] Invalid render request: ${parsed.error.message}`);
  }

  // Load theme
  const theme = getTheme(request.accountType);
  console.log(
    `[Pipeline] Starting render for "${request.accountType}" — ${request.aspectRatios.length} aspect ratio(s)`
  );

  // Process each aspect ratio concurrently
  const results = await Promise.allSettled(
    request.aspectRatios.map(async (aspectRatio) => {
      const ratioStart = performance.now();

      // Load canvas
      const canvas = getCanvas(aspectRatio);

      // Spatial analysis
      const spatialStart = performance.now();
      const spatialResult = await analyzeSpatial(
        request.backgroundImage,
        canvas,
        theme,
        request.subjectPosition
      );
      console.log(
        `[Pipeline] Spatial analysis complete for ${aspectRatio} (${Math.round(performance.now() - spatialStart)}ms)`
      );

      // Layout resolution
      const layoutStart = performance.now();
      const layoutResult = await resolveLayout(request, canvas, theme, spatialResult);
      console.log(
        `[Pipeline] Layout resolved for ${aspectRatio} (${Math.round(performance.now() - layoutStart)}ms)`
      );

      // HTML building
      const htmlStart = performance.now();
      const html = await buildHtml(layoutResult);
      console.log(
        `[Pipeline] HTML built for ${aspectRatio} (${Math.round(performance.now() - htmlStart)}ms)`
      );

      // Rendering
      const renderStart = performance.now();
      const imageBuffer = await renderToImage(html, canvas);
      console.log(
        `[Pipeline] Rendered ${aspectRatio} at ${canvas.width}x${canvas.height} (${Math.round(performance.now() - renderStart)}ms)`
      );

      const result: RenderResult = {
        aspectRatio,
        canvasId: canvas.id,
        width: canvas.width,
        height: canvas.height,
        imageBuffer,
        metadata: {
          textZone: spatialResult.textZone,
          blocksRendered: [
            ...layoutResult.stackedBlocks.map((b) => b.type),
            ...layoutResult.pinnedBlocks.map((b) => b.type),
          ],
        },
      };

      return result;
    })
  );

  // Collect successful results, log failures
  const successResults: RenderResult[] = [];
  let failCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      successResults.push(result.value);
    } else {
      failCount++;
      console.error(`[Pipeline] Render failed: ${result.reason}`);
    }
  }

  const totalMs = Math.round(performance.now() - totalStart);
  console.log(
    `[Pipeline] Complete — ${successResults.length}/${request.aspectRatios.length} succeeded (${totalMs}ms total)`
  );

  return successResults;
}
