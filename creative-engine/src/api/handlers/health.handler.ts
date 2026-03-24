import type { Request, Response } from "express";
import { getAllBlockDefinitions } from "../../config/blocks/registry.js";
import { getAllThemes } from "../../config/themes/index.js";
import { getAllCanvases } from "../../config/canvases.js";
import { browserPool } from "../../engine/renderer/browser-pool.js";
import { successResponse } from "../responses.js";

/**
 * GET /health — Returns server health status and configuration summary.
 */
export function healthHandler(_req: Request, res: Response): void {
  res.json(
    successResponse({
      status: "healthy",
      uptime: Math.round(process.uptime()),
      version: "1.0.0",
      configs: {
        blocks: getAllBlockDefinitions().length,
        themes: getAllThemes().length,
        canvases: getAllCanvases().length,
      },
      browserPool: browserPool.getStats(),
    })
  );
}
