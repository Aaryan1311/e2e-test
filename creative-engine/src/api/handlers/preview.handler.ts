import type { Request, Response, NextFunction } from "express";
import type { RenderRequest } from "../../types/index.js";
import { getTheme } from "../../config/themes/index.js";
import { canvasFromImage } from "../../engine/canvas-from-image.js";
import { resolveLayoutMode } from "../../engine/layout-modes/index.js";
import { resolveLayout } from "../../engine/layout-resolver/index.js";
import { buildHtml } from "../../engine/html-builder/index.js";
import { checkQuality } from "../../engine/quality-checker/index.js";
import { successResponse } from "../responses.js";
import type { SpatialAnalysisResult } from "../../engine/types.js";

/**
 * POST /preview — Returns generated HTML instead of PNG for debugging.
 * Canvas size derived from the background image.
 */
export async function previewHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const request = req.body as RenderRequest;
    const theme = getTheme(request.accountType);
    const canvas = await canvasFromImage(request.backgroundImage);

    const layoutConfig = await resolveLayoutMode(request, canvas, theme);

    const spatialResult: SpatialAnalysisResult = {
      subjectBounds: null,
      textZone: layoutConfig.textZone,
      overlay: layoutConfig.overlay ?? { type: "none", css: "", opacity: 0 },
      confidence: 1.0,
    };

    const layoutResult = await resolveLayout(request, canvas, theme, spatialResult, layoutConfig);
    const qualityCheck = checkQuality(layoutResult);
    const html = await buildHtml(layoutResult, request.includeLogo);

    res.json(
      successResponse({
        html,
        layoutResult: {
          canvas: layoutResult.canvas,
          textZone: layoutResult.textZone,
          overlay: layoutResult.overlay,
          stackedBlocks: layoutResult.stackedBlocks.map((b) => ({
            type: b.type,
            bounds: b.bounds,
            scaledFontSize: b.scaledFontSize,
          })),
          pinnedBlocks: layoutResult.pinnedBlocks.map((b) => ({
            type: b.type,
            bounds: b.bounds,
          })),
          metadata: layoutResult.metadata,
        },
        qualityCheck,
      })
    );
  } catch (error) {
    next(error);
  }
}
