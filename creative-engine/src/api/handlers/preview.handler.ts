import type { Request, Response, NextFunction } from "express";
import type { RenderRequest } from "../../types/index.js";
import { getTheme } from "../../config/themes/index.js";
import { getCanvas } from "../../config/canvases.js";
import { analyzeSpatial } from "../../engine/spatial-analyzer/index.js";
import { resolveLayout } from "../../engine/layout-resolver/index.js";
import { buildHtml } from "../../engine/html-builder/index.js";
import { checkQuality } from "../../engine/quality-checker/index.js";
import { successResponse } from "../responses.js";

/**
 * POST /preview — Returns generated HTML instead of PNG for debugging.
 * Only processes the first aspect ratio from the request.
 */
export async function previewHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const request = req.body as RenderRequest;
    const theme = getTheme(request.accountType);
    const aspectRatio = request.aspectRatios[0]!;
    const canvas = getCanvas(aspectRatio);

    const spatialResult = await analyzeSpatial(
      request.backgroundImage,
      canvas,
      theme,
      request.subjectPosition
    );

    const layoutResult = await resolveLayout(request, canvas, theme, spatialResult);
    const qualityCheck = checkQuality(layoutResult);
    const html = await buildHtml(layoutResult);

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
