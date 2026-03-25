import { Router, type Request, type Response } from "express";
import { RenderRequestSchema } from "../types/index.js";
import { render, preview } from "../engine/pipeline.js";
import { themes, FIELD_STYLE_RULES } from "../config/themes.js";

export const router: ReturnType<typeof Router> = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    themes: Object.keys(themes),
    fieldTypes: Object.keys(FIELD_STYLE_RULES),
  });
});

router.post("/render", async (req: Request, res: Response) => {
  try {
    const parsed = RenderRequestSchema.parse(req.body);
    const result = await render(parsed);

    res.json({
      imageBase64: result.imageBuffer.toString("base64"),
      width: result.width,
      height: result.height,
      textZone: result.textZone,
      fieldSizes: result.fieldSizes,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Render]", message);
    res.status(400).json({ error: message });
  }
});

router.post("/preview", async (req: Request, res: Response) => {
  try {
    const parsed = RenderRequestSchema.parse(req.body);
    const html = await preview(parsed);

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Preview]", message);
    res.status(400).json({ error: message });
  }
});
