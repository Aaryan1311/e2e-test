import type { CanvasDefinition, ThemeDefinition, SplitLayoutConfig } from "../../types/index.js";
import type { ResolvedLayoutConfig, TextZone } from "../types.js";
import { generateInfinityBridgePath } from "./infinity-bridge.js";

/** Estimated height reserved for the logo area */
const LOGO_HEIGHT_ESTIMATE = 60;
/** Bottom margin below the logo */
const LOGO_BOTTOM_MARGIN = 16;
/** Height reserved for disclaimer strip at bottom */
const DISCLAIMER_STRIP_HEIGHT = 40;

/**
 * Resolves layout configuration for split mode.
 *
 * Split mode divides the canvas into a solid-color content panel (for text)
 * and an image panel. No spatial analysis is needed — the text zone is
 * deterministic based on panel ratio and padding.
 */
export function resolveSplitLayout(
  canvas: CanvasDefinition,
  theme: ThemeDefinition,
  splitConfig?: SplitLayoutConfig
): ResolvedLayoutConfig {
  const side = splitConfig?.contentPanelSide ?? "left";
  const ratio = splitConfig?.contentPanelRatio ?? 0.45;
  const bgColor = splitConfig?.contentPanelColor ?? theme.colors.primary;
  const showBridge = splitConfig?.showInfinityBridge ?? false;
  const bridgeColor = splitConfig?.infinityBridgeColor ?? "#FFFFFF";
  const bridgeOpacity = splitConfig?.infinityBridgeOpacity ?? 1.0;

  const contentPadding = parseFloat(theme.layout.contentPadding) || 40;
  const contentWidth = Math.round(canvas.width * ratio);
  const imageWidth = canvas.width - contentWidth;

  let contentPanel: ResolvedLayoutConfig["contentPanel"];
  let imagePanel: ResolvedLayoutConfig["imagePanel"];

  if (side === "left") {
    contentPanel = {
      side: "left",
      x: 0,
      y: 0,
      width: contentWidth,
      height: canvas.height,
      backgroundColor: bgColor,
    };
    imagePanel = {
      side: "right",
      x: contentWidth,
      y: 0,
      width: imageWidth,
      height: canvas.height,
    };
  } else {
    imagePanel = {
      side: "left",
      x: 0,
      y: 0,
      width: imageWidth,
      height: canvas.height,
    };
    contentPanel = {
      side: "right",
      x: imageWidth,
      y: 0,
      width: contentWidth,
      height: canvas.height,
      backgroundColor: bgColor,
    };
  }

  // Text zone within the content panel
  const textZoneX = contentPanel.x + contentPadding;
  const textZoneY = contentPadding + LOGO_HEIGHT_ESTIMATE + LOGO_BOTTOM_MARGIN;
  const textZoneWidth = contentPanel.width - contentPadding * 2;
  const textZoneHeight =
    canvas.height - textZoneY - contentPadding - DISCLAIMER_STRIP_HEIGHT;

  const textZone: TextZone = {
    x: textZoneX,
    y: textZoneY,
    width: Math.max(0, textZoneWidth),
    height: Math.max(0, textZoneHeight),
    side,
  };

  // Infinity bridge (optional)
  let infinityBridge: ResolvedLayoutConfig["infinityBridge"] | undefined;
  if (showBridge) {
    const bridgeWidth = Math.round(canvas.width * 0.08);
    const bridgeHeight = Math.round(canvas.height * 0.15);
    const junctionX = side === "left" ? contentWidth : imageWidth;
    infinityBridge = {
      x: junctionX - Math.round(bridgeWidth / 2),
      y: Math.round((canvas.height - bridgeHeight) / 2),
      width: bridgeWidth,
      height: bridgeHeight,
      color: bridgeColor,
      opacity: bridgeOpacity,
      svgPath: generateInfinityBridgePath(bridgeWidth, bridgeHeight),
    };
  }

  return {
    mode: "split",
    contentPanel,
    imagePanel,
    infinityBridge,
    textZone,
  };
}
