import { Router, type Router as RouterType } from "express";
import { RenderRequestSchema } from "../types/index.js";
import { validate } from "./middleware/validator.js";
import { healthHandler } from "./handlers/health.handler.js";
import * as configHandler from "./handlers/config.handler.js";
import { renderHandler } from "./handlers/render.handler.js";
import { previewHandler } from "./handlers/preview.handler.js";

const router: RouterType = Router();

// Health check
router.get("/health", healthHandler);

// Config inspection endpoints
router.get("/config/blocks", configHandler.listBlocks);
router.get("/config/blocks/:type", configHandler.getBlock);
router.get("/config/themes", configHandler.listThemes);
router.get("/config/themes/:id", configHandler.getThemeById);
router.get("/config/canvases", configHandler.listCanvases);

// Render endpoints
router.post("/render", validate(RenderRequestSchema), renderHandler);
router.post("/preview", validate(RenderRequestSchema), previewHandler);

export { router };
