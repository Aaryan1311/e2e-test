import { z } from "zod/v4";
import { BlockInstanceSchema } from "./block.types.js";
import type { BlockInstance } from "./block.types.js";

/** Layout modes determine the fundamental composition structure */
export type LayoutMode = "split" | "image-overlay" | "image-forward";

/** Configuration overrides for split layout mode */
export interface SplitLayoutConfig {
  contentPanelSide?: "left" | "right";
  contentPanelRatio?: number;
  contentPanelColor?: string;
  showInfinityBridge?: boolean;
  infinityBridgeColor?: string;
  infinityBridgeOpacity?: number;
}

export interface RenderRequest {
  accountType: string;
  aspectRatios: string[];
  backgroundImage: string;
  blocks: BlockInstance[];
  layoutMode?: LayoutMode;
  splitConfig?: SplitLayoutConfig;
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

// --- Zod Schemas ---

export const LayoutModeSchema = z.enum(["split", "image-overlay", "image-forward"]);

export const SplitLayoutConfigSchema = z.object({
  contentPanelSide: z.enum(["left", "right"]).optional(),
  contentPanelRatio: z.number().min(0).max(1).optional(),
  contentPanelColor: z.string().optional(),
  showInfinityBridge: z.boolean().optional(),
  infinityBridgeColor: z.string().optional(),
  infinityBridgeOpacity: z.number().min(0).max(1).optional(),
});

export const RenderRequestSchema = z.object({
  accountType: z.string().min(1),
  aspectRatios: z.array(z.string().regex(/^\d+:\d+$/)).min(1),
  backgroundImage: z.string(),
  blocks: z.array(BlockInstanceSchema).min(1),
  layoutMode: LayoutModeSchema.optional(),
  splitConfig: SplitLayoutConfigSchema.optional(),
  subjectPosition: z
    .object({
      x: z.number().min(0),
      y: z.number().min(0),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
});
