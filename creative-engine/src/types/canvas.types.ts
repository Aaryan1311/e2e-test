import { z } from "zod/v4";

export interface CanvasDefinition {
  id: string;
  name: string;
  aspectRatio: string;
  width: number;
  height: number;
}

// --- Zod Schema ---

export const CanvasDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  aspectRatio: z.string().regex(/^\d+:\d+$/, "Aspect ratio must be in format 'W:H'"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
