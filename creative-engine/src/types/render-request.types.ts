import { z } from "zod/v4";
import { BlockInstanceSchema } from "./block.types.js";
import type { BlockInstance } from "./block.types.js";

export interface RenderRequest {
  accountType: string;
  aspectRatios: string[];
  backgroundImage: string;
  blocks: BlockInstance[];
  subjectPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface RenderResult {
  aspectRatio: string;
  canvasId: string;
  width: number;
  height: number;
  imageBuffer: Buffer;
  metadata: {
    textZone: { x: number; y: number; width: number; height: number };
    blocksRendered: string[];
    qualityChecks?: Record<string, boolean>;
  };
}

// --- Zod Schema ---

export const RenderRequestSchema = z.object({
  accountType: z.string().min(1),
  aspectRatios: z.array(z.string().regex(/^\d+:\d+$/)).min(1),
  backgroundImage: z.string(),
  blocks: z.array(BlockInstanceSchema).min(1),
  subjectPosition: z
    .object({
      x: z.number().min(0),
      y: z.number().min(0),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
});
