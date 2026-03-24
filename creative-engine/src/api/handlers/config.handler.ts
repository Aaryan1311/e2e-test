import type { Request, Response, NextFunction } from "express";
import {
  getAllBlockDefinitions,
  getBlockDefinition,
} from "../../config/blocks/registry.js";
import { getAllThemes, getTheme } from "../../config/themes/index.js";
import { getAllCanvases } from "../../config/canvases.js";
import { successResponse } from "../responses.js";

/** GET /config/blocks — returns all registered block types */
export function listBlocks(_req: Request, res: Response): void {
  const blocks = getAllBlockDefinitions().map((b) => ({
    type: b.type,
    displayName: b.displayName,
    positionMode: b.positionMode,
    priority: b.priority,
    isOptional: b.isOptional,
  }));
  res.json(successResponse({ blocks }));
}

/** GET /config/blocks/:type — returns a single block definition */
export function getBlock(req: Request, res: Response, next: NextFunction): void {
  try {
    const block = getBlockDefinition(req.params["type"] as string);
    res.json(successResponse(block));
  } catch (error) {
    next(error);
  }
}

/** GET /config/themes — returns all registered themes */
export function listThemes(_req: Request, res: Response): void {
  const themes = getAllThemes().map((t) => ({
    id: t.id,
    displayName: t.displayName,
    colors: t.colors,
  }));
  res.json(successResponse({ themes }));
}

/** GET /config/themes/:id — returns a single theme definition */
export function getThemeById(req: Request, res: Response, next: NextFunction): void {
  try {
    const theme = getTheme(req.params["id"] as string);
    res.json(successResponse(theme));
  } catch (error) {
    next(error);
  }
}

/** GET /config/canvases — returns all registered canvases */
export function listCanvases(_req: Request, res: Response): void {
  const canvases = getAllCanvases().map((c) => ({
    id: c.id,
    name: c.name,
    aspectRatio: c.aspectRatio,
    width: c.width,
    height: c.height,
  }));
  res.json(successResponse({ canvases }));
}
