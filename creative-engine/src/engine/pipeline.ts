import { RenderRequestSchema } from "../types/index.js";
import type { RenderRequest, RenderResult } from "../types/index.js";
import { getTheme } from "../config/themes/index.js";
import { getCanvas } from "../config/canvases.js";
import { analyzeSpatial } from "./spatial-analyzer/index.js";
import { resolveLayout } from "./layout-resolver/index.js";
import { buildHtml } from "./html-builder/index.js";
import { renderToImage } from "./renderer/index.js";
import { checkQuality } from "./quality-checker/index.js";
import type { LayoutResult, QualityCheckResult } from "./types.js";

const MAX_FIX_ATTEMPTS = 2;

/**
 * Attempts to auto-fix a layout that failed quality checks by adjusting
 * the theme's blockGap (for overlap/spacing issues) or scaling down blocks
 * (for overflow issues). Returns a new layout result.
 */
async function attemptAutoFix(
  request: RenderRequest,
  canvas: ReturnType<typeof getCanvas>,
  theme: ReturnType<typeof getTheme>,
  spatialResult: Awaited<ReturnType<typeof analyzeSpatial>>,
  qualityResult: QualityCheckResult
): Promise<LayoutResult> {
  // Create a modified theme for the fix attempt
  const modifiedTheme = structuredClone(theme);

  for (const check of qualityResult.checks) {
    if (check.passed) continue;

    if (check.name === "overlap" || check.name === "spacing") {
      // Increase blockGap by 25%
      const currentGap = parseFloat(modifiedTheme.layout.blockGap) || 16;
      modifiedTheme.layout.blockGap = `${Math.round(currentGap * 1.25)}px`;
    }

    if (check.name === "overflow") {
      // Reduce default text zone width by 10%
      const currentWidth = parseFloat(modifiedTheme.layout.defaultTextZoneWidth) || 55;
      modifiedTheme.layout.defaultTextZoneWidth = `${Math.round(currentWidth * 0.9)}%`;
    }
  }

  return resolveLayout(request, canvas, modifiedTheme, spatialResult);
}

/**
 * End-to-end pipeline: takes a raw RenderRequest and produces final PNG images.
 *
 * Steps per aspect ratio:
 * 1. Validate request via Zod schema
 * 2. Load theme and canvas configs
 * 3. Run spatial analysis on the background image
 * 4. Resolve layout (block positions)
 * 5. Run quality checks (with auto-fix attempts)
 * 6. Build self-contained HTML
 * 7. Render to PNG via Puppeteer
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
      let layoutResult = await resolveLayout(request, canvas, theme, spatialResult);
      console.log(
        `[Pipeline] Layout resolved for ${aspectRatio} (${Math.round(performance.now() - layoutStart)}ms)`
      );

      // Quality check with auto-fix
      let qualityResult = checkQuality(layoutResult);
      console.log(
        `[Quality] ${aspectRatio} — score: ${qualityResult.score}, passed: ${qualityResult.passed}`
      );

      if (!qualityResult.passed) {
        for (let attempt = 0; attempt < MAX_FIX_ATTEMPTS; attempt++) {
          // Check if it's a hard fail (font-size) that can't be auto-fixed
          const hasFontSizeError = qualityResult.checks.some(
            (c) => c.name === "font-size" && !c.passed
          );
          if (hasFontSizeError) {
            console.warn(`[Quality] Font size error cannot be auto-fixed for ${aspectRatio}`);
            break;
          }

          console.log(`[Quality] Attempting auto-fix #${attempt + 1} for ${aspectRatio}`);
          layoutResult = await attemptAutoFix(
            request, canvas, theme, spatialResult, qualityResult
          );
          qualityResult = checkQuality(layoutResult);
          console.log(
            `[Quality] After fix #${attempt + 1}: score: ${qualityResult.score}, passed: ${qualityResult.passed}`
          );

          if (qualityResult.passed) break;
        }

        if (!qualityResult.passed) {
          console.warn(
            `[Quality] Proceeding with imperfect layout for ${aspectRatio} (score: ${qualityResult.score})`
          );
        }
      }

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

      // Build quality checks map for metadata
      const qualityChecks: Record<string, boolean> = {};
      for (const check of qualityResult.checks) {
        qualityChecks[check.name] = check.passed;
      }

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
          qualityChecks,
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
