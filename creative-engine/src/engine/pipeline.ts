import { RenderRequestSchema } from "../types/index.js";
import type { RenderRequest, RenderResult, LayoutMode } from "../types/index.js";
import { getTheme } from "../config/themes/index.js";
import { canvasFromImage } from "./canvas-from-image.js";
import { resolveLayoutMode } from "./layout-modes/index.js";
import { resolveLayout } from "./layout-resolver/index.js";
import { buildHtml } from "./html-builder/index.js";
import { renderToImage } from "./renderer/index.js";
import { checkQuality } from "./quality-checker/index.js";
import type { LayoutResult, QualityCheckResult, SpatialAnalysisResult } from "./types.js";

const MAX_FIX_ATTEMPTS = 2;

/**
 * Attempts to auto-fix a layout that failed quality checks.
 */
async function attemptAutoFix(
  request: RenderRequest,
  canvas: ReturnType<typeof canvasFromImage extends (...args: unknown[]) => Promise<infer R> ? R : never>,
  theme: ReturnType<typeof getTheme>,
  spatialResult: SpatialAnalysisResult,
  qualityResult: QualityCheckResult,
  layoutConfig?: LayoutResult["layoutConfig"]
): Promise<LayoutResult> {
  const modifiedTheme = structuredClone(theme);

  for (const check of qualityResult.checks) {
    if (check.passed) continue;

    if (check.name === "overlap" || check.name === "spacing") {
      const currentGap = parseFloat(modifiedTheme.layout.blockGap) || 16;
      modifiedTheme.layout.blockGap = `${Math.round(currentGap * 1.25)}px`;
    }

    if (check.name === "overflow") {
      const currentWidth = parseFloat(modifiedTheme.layout.defaultTextZoneWidth) || 55;
      modifiedTheme.layout.defaultTextZoneWidth = `${Math.round(currentWidth * 0.9)}%`;
    }
  }

  return resolveLayout(request, canvas, modifiedTheme, spatialResult, layoutConfig);
}

/**
 * Primary pipeline: one image in, one image out.
 *
 * Steps:
 * 1. Validate request via Zod schema
 * 2. Load theme
 * 3. Read image dimensions → create canvas (canvasFromImage)
 * 4. Resolve layout mode (split/overlay/forward)
 * 5. Resolve layout (sort blocks, merge styles, allocate space, calculate positions)
 * 6. Quality check (with auto-fix if needed)
 * 7. Build HTML
 * 8. Render to PNG via Puppeteer
 * 9. Return single RenderResult
 */
export async function generateCreative(
  request: RenderRequest
): Promise<RenderResult> {
  const totalStart = performance.now();

  // Validate request
  const parsed = RenderRequestSchema.safeParse(request);
  if (!parsed.success) {
    throw new Error(`[Pipeline] Invalid render request: ${parsed.error.message}`);
  }

  // Warn about deprecated aspectRatios
  if (request.aspectRatios && request.aspectRatios.length > 0) {
    console.warn(
      `[Pipeline] "aspectRatios" is deprecated — canvas size is now derived from the background image`
    );
  }

  // Default layoutMode if not provided
  const layoutMode: LayoutMode = request.layoutMode ?? "split";
  if (!request.layoutMode) {
    console.warn("[Pipeline] No layoutMode specified, defaulting to 'split'");
  }

  // Load theme
  const theme = getTheme(request.accountType);
  console.log(
    `[Pipeline] Starting render for "${request.accountType}" mode="${layoutMode}"`
  );

  // Read image dimensions → create canvas
  const canvas = await canvasFromImage(request.backgroundImage);
  console.log(
    `[Pipeline] Canvas from image: ${canvas.width}x${canvas.height} (${canvas.aspectRatio})`
  );

  // Resolve layout mode configuration
  const modeStart = performance.now();
  const layoutConfig = await resolveLayoutMode(request, canvas, theme);
  console.log(
    `[Pipeline] Layout mode "${layoutMode}" resolved (${Math.round(performance.now() - modeStart)}ms)`
  );

  // Create spatial result
  const spatialResult: SpatialAnalysisResult = {
    subjectBounds: null,
    textZone: layoutConfig.textZone,
    overlay: layoutConfig.overlay ?? {
      type: "none",
      css: "",
      opacity: 0,
    },
    confidence: layoutMode === "split" || layoutMode === "image-forward" ? 1.0 : 0.5,
  };

  // Layout resolution
  const layoutStart = performance.now();
  let layoutResult = await resolveLayout(
    request, canvas, theme, spatialResult, layoutConfig
  );
  console.log(
    `[Pipeline] Layout resolved (${Math.round(performance.now() - layoutStart)}ms)`
  );

  // Quality check with auto-fix
  let qualityResult = checkQuality(layoutResult);
  console.log(
    `[Quality] score: ${qualityResult.score}, passed: ${qualityResult.passed}`
  );

  if (!qualityResult.passed) {
    for (let attempt = 0; attempt < MAX_FIX_ATTEMPTS; attempt++) {
      const hasFontSizeError = qualityResult.checks.some(
        (c) => c.name === "font-size" && !c.passed
      );
      if (hasFontSizeError) {
        console.warn(`[Quality] Font size error cannot be auto-fixed`);
        break;
      }

      console.log(`[Quality] Attempting auto-fix #${attempt + 1}`);
      layoutResult = await attemptAutoFix(
        request, canvas, theme, spatialResult, qualityResult, layoutConfig
      );
      qualityResult = checkQuality(layoutResult);
      console.log(
        `[Quality] After fix #${attempt + 1}: score: ${qualityResult.score}, passed: ${qualityResult.passed}`
      );

      if (qualityResult.passed) break;
    }

    if (!qualityResult.passed) {
      console.warn(
        `[Quality] Proceeding with imperfect layout (score: ${qualityResult.score})`
      );
    }
  }

  // HTML building — pass includeLogo flag
  const htmlStart = performance.now();
  const html = await buildHtml(layoutResult, request.includeLogo);
  console.log(
    `[Pipeline] HTML built (${Math.round(performance.now() - htmlStart)}ms)`
  );

  // Rendering
  const renderStart = performance.now();
  const imageBuffer = await renderToImage(html, canvas);
  console.log(
    `[Pipeline] Rendered at ${canvas.width}x${canvas.height} (${Math.round(performance.now() - renderStart)}ms)`
  );

  // Build quality checks map
  const qualityChecks: Record<string, boolean> = {};
  for (const check of qualityResult.checks) {
    qualityChecks[check.name] = check.passed;
  }

  const totalMs = Math.round(performance.now() - totalStart);
  console.log(`[Pipeline] Complete (${totalMs}ms total)`);

  return {
    aspectRatio: canvas.aspectRatio,
    canvasId: canvas.id,
    width: canvas.width,
    height: canvas.height,
    imageBuffer,
    metadata: {
      textZone: layoutConfig.textZone,
      blocksRendered: [
        ...layoutResult.stackedBlocks.map((b) => b.type),
        ...layoutResult.pinnedBlocks.map((b) => b.type),
      ],
      qualityChecks,
    },
  };
}

/**
 * @deprecated Use generateCreative (singular) instead.
 * Kept for backward compatibility. Ignores aspectRatios and returns
 * a single-element array with the result from generateCreative.
 */
export async function generateCreatives(
  request: RenderRequest
): Promise<RenderResult[]> {
  console.warn(
    "[Pipeline] generateCreatives is deprecated — use generateCreative (singular)"
  );
  const result = await generateCreative(request);
  return [result];
}
