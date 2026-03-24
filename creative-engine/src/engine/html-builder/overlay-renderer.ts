import type { CanvasDefinition } from "../../types/index.js";
import type { OverlayConfig, TextZone } from "../types.js";

/**
 * Generates the overlay layer HTML/CSS for text readability.
 *
 * - Gradient overlays cover the full canvas (the gradient itself handles directionality).
 * - Solid overlays cover the text zone area plus 10% bleed on each side.
 * - "none" type returns an empty string.
 */
export function renderOverlay(
  overlay: OverlayConfig,
  textZone: TextZone,
  canvas: CanvasDefinition
): string {
  if (overlay.type === "none") {
    return "";
  }

  if (overlay.type === "gradient") {
    return `<div style="
      position: absolute;
      top: 0; left: 0;
      width: ${canvas.width}px;
      height: ${canvas.height}px;
      background: ${overlay.css};
      opacity: ${overlay.opacity};
      z-index: 2;
    "></div>`;
  }

  // Solid overlay — cover text zone with 10% bleed
  const bleedX = Math.round(textZone.width * 0.1);
  const bleedY = Math.round(textZone.height * 0.1);
  const x = Math.max(0, textZone.x - bleedX);
  const y = Math.max(0, textZone.y - bleedY);
  const width = Math.min(canvas.width - x, textZone.width + bleedX * 2);
  const height = Math.min(canvas.height - y, textZone.height + bleedY * 2);

  return `<div style="
    position: absolute;
    left: ${x}px;
    top: ${y}px;
    width: ${width}px;
    height: ${height}px;
    background: ${overlay.css};
    opacity: ${overlay.opacity};
    z-index: 2;
  "></div>`;
}
