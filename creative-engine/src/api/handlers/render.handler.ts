import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import type { RenderRequest } from "../../types/index.js";
import { generateCreatives } from "../../engine/pipeline.js";
import { successResponse } from "../responses.js";
import type { RenderApiResponse } from "../../types/api.types.js";

const OUTPUT_DIR = process.env["OUTPUT_DIR"] ?? "./output";

/**
 * POST /render — Main creative generation endpoint.
 * Accepts a RenderRequest, runs the full pipeline, returns rendered images.
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

    const results = await generateCreatives(request);

    // Save files to output directory
    const outputPath = resolve(OUTPUT_DIR, requestId);
    await mkdir(outputPath, { recursive: true });

    const renders: RenderApiResponse["renders"] = [];

    for (const result of results) {
      const filename = `${result.aspectRatio.replace(":", "x")}.png`;
      const filePath = resolve(outputPath, filename);
      await writeFile(filePath, result.imageBuffer);

      renders.push({
        aspectRatio: result.aspectRatio,
        canvasId: result.canvasId,
        width: result.width,
        height: result.height,
        imageUrl: filePath,
        imageBase64: format === "base64"
          ? result.imageBuffer.toString("base64")
          : undefined,
        quality: {
          score: 100, // Default if no quality checks in metadata
          passed: true,
          checks: result.metadata.qualityChecks ?? {},
          warnings: [],
        },
      });
    }

    const duration = Math.round(performance.now() - start);

    const response: RenderApiResponse = {
      renders,
      summary: {
        total: request.aspectRatios.length,
        succeeded: results.length,
        failed: request.aspectRatios.length - results.length,
        totalDuration: duration,
      },
    };

    res.json(successResponse(response, { requestId, duration }));
  } catch (error) {
    next(error);
  }
}
