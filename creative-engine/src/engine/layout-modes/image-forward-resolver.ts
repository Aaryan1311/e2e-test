import type { CanvasDefinition, ThemeDefinition } from "../../types/index.js";
import type { ResolvedLayoutConfig, TextZone } from "../types.js";

/**
 * Resolves layout configuration for image-forward mode.
 *
 * Image fills the entire canvas. Only pinned blocks (logo, disclaimer)
 * are rendered. Text zone is minimal — just enough for pinned blocks.
 * No overlay is generated.
 */
export function resolveImageForwardLayout(
  canvas: CanvasDefinition,
  theme: ThemeDefinition
): ResolvedLayoutConfig {
  const contentPadding = parseFloat(theme.layout.contentPadding) || 40;

  // Minimal text zone — only for pinned blocks
  const textZone: TextZone = {
    x: contentPadding,
    y: contentPadding,
    width: canvas.width - contentPadding * 2,
    height: canvas.height - contentPadding * 2,
    side: "center",
  };

  return {
    mode: "image-forward",
    overlay: { type: "none", css: "", opacity: 0 },
    textZone,
  };
}
