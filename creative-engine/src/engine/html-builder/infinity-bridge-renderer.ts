import type { ResolvedLayoutConfig } from "../types.js";

/**
 * Renders the infinity symbol SVG positioned at the panel junction.
 * Returns an empty string if no bridge config is provided.
 */
export function renderInfinityBridge(
  bridge: ResolvedLayoutConfig["infinityBridge"]
): string {
  if (!bridge) return "";

  return `<svg style="
    position: absolute;
    left: ${bridge.x}px;
    top: ${bridge.y}px;
    width: ${bridge.width}px;
    height: ${bridge.height}px;
    z-index: 5;
    opacity: ${bridge.opacity};
  " viewBox="0 0 ${bridge.width} ${bridge.height}" xmlns="http://www.w3.org/2000/svg">
    <path d="${bridge.svgPath}" fill="${bridge.color}" />
  </svg>`;
}
