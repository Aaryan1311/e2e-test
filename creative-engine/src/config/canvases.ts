import { CanvasDefinitionSchema } from "../types/canvas.types.js";
import type { CanvasDefinition } from "../types/canvas.types.js";

const allCanvases: CanvasDefinition[] = [
  { id: "square_1x1", name: "Square", aspectRatio: "1:1", width: 1080, height: 1080 },
  { id: "portrait_9x16", name: "Portrait", aspectRatio: "9:16", width: 1080, height: 1920 },
  { id: "landscape_16x9", name: "Landscape", aspectRatio: "16:9", width: 1920, height: 1080 },
  { id: "story_4x5", name: "Story", aspectRatio: "4:5", width: 1080, height: 1350 },
  { id: "post_3x4", name: "Post", aspectRatio: "3:4", width: 1080, height: 1440 },
  { id: "wide_banner_2x1", name: "Wide Banner", aspectRatio: "2:1", width: 1200, height: 600 },
  { id: "tall_banner_1x2", name: "Tall Banner", aspectRatio: "1:2", width: 600, height: 1200 },
  { id: "leaderboard_728x90", name: "Leaderboard", aspectRatio: "728:90", width: 728, height: 90 },
  { id: "email_header_3x1", name: "Email Header", aspectRatio: "3:1", width: 1200, height: 400 },
];

/** Canvas registry keyed by aspect ratio */
const canvasByRatio = new Map<string, CanvasDefinition>();
/** Canvas registry keyed by id */
const canvasById = new Map<string, CanvasDefinition>();

// Validate and register all canvases at load time
for (const canvas of allCanvases) {
  const result = CanvasDefinitionSchema.safeParse(canvas);
  if (!result.success) {
    throw new Error(
      `Invalid canvas definition "${canvas.id}": ${result.error.message}`
    );
  }
  canvasByRatio.set(canvas.aspectRatio, canvas);
  canvasById.set(canvas.id, canvas);
}

/**
 * Retrieves a canvas definition by its aspect ratio string (e.g., "1:1").
 * @throws Error if no canvas matches the aspect ratio
 */
export function getCanvas(aspectRatio: string): CanvasDefinition {
  const canvas = canvasByRatio.get(aspectRatio);
  if (!canvas) {
    const available = Array.from(canvasByRatio.keys()).join(", ");
    throw new Error(
      `No canvas found for aspect ratio "${aspectRatio}". Available: ${available}`
    );
  }
  return canvas;
}

/**
 * Retrieves a canvas definition by its id (e.g., "square_1x1").
 * @throws Error if no canvas matches the id
 */
export function getCanvasById(id: string): CanvasDefinition {
  const canvas = canvasById.get(id);
  if (!canvas) {
    const available = Array.from(canvasById.keys()).join(", ");
    throw new Error(
      `No canvas found with id "${id}". Available: ${available}`
    );
  }
  return canvas;
}

/** Returns all registered canvas definitions */
export function getAllCanvases(): CanvasDefinition[] {
  return Array.from(canvasById.values());
}
