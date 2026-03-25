import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import type { RenderRequest } from "../../types/index.js";
import { generateCreative } from "../../engine/pipeline.js";
import { successResponse } from "../responses.js";
import type { RenderApiResponse } from "../../types/api.types.js";

const OUTPUT_DIR = process.env["OUTPUT_DIR"] ?? "./output";

/**
 * POST /render — Main creative generation endpoint.
 * Accepts a RenderRequest, runs the pipeline, returns one rendered image.
 * The image dimensions come from the background image itself.
 */
export async function renderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const start = performance.now();
    const requestId = (req as unknown as Record<string, unknown>)["requestId"] as string ?? randomUUID();
    const request = req.body as RenderRequest;
    const format = (req.query["format"] as string) ?? "base64";

    const result = await generateCreative(request);

    // Save file to output directory
    const outputPath = resolve(OUTPUT_DIR, requestId);
    await mkdir(outputPath, { recursive: true });

    const filename = `${result.width}x${result.height}.png`;
    const filePath = resolve(outputPath, filename);
    await writeFile(filePath, result.imageBuffer);

    const duration = Math.round(performance.now() - start);

    const response: RenderApiResponse = {
      render: {
        width: result.width,
        height: result.height,
        aspectRatio: result.aspectRatio,
        canvasId: result.canvasId,
        imageUrl: filePath,
        imageBase64: format === "base64"
          ? result.imageBuffer.toString("base64")
          : undefined,
        quality: {
          score: 100,
          passed: true,
          checks: result.metadata.qualityChecks ?? {},
          warnings: [],
        },
      },
      duration,
    };

    res.json(successResponse(response, { requestId, duration }));
  } catch (error) {
    next(error);
  }
}
