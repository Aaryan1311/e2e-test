import type {
  RenderRequest,
  CanvasDefinition,
  ThemeDefinition,
} from "../../types/index.js";
import type { ResolvedLayoutConfig } from "../types.js";
import { resolveSplitLayout } from "./split-resolver.js";
import { resolveImageOverlayLayout } from "./image-overlay-resolver.js";
import { resolveImageForwardLayout } from "./image-forward-resolver.js";

/**
 * Routes to the correct layout mode resolver based on request.layoutMode.
 */
export async function resolveLayoutMode(
  request: RenderRequest,
  canvas: CanvasDefinition,
  theme: ThemeDefinition
): Promise<ResolvedLayoutConfig> {
  const mode = request.layoutMode ?? "split";

  switch (mode) {
    case "split":
      return resolveSplitLayout(canvas, theme, request.splitConfig);

    case "image-overlay":
      return resolveImageOverlayLayout(
        request.backgroundImage,
        canvas,
        theme,
        request.subjectPosition
      );

    case "image-forward":
      return resolveImageForwardLayout(canvas, theme);

    default:
      console.warn(`[Layout] Unknown layout mode "${mode}", falling back to split`);
      return resolveSplitLayout(canvas, theme, request.splitConfig);
  }
}
