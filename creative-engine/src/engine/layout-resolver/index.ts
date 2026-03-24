import type {
  RenderRequest,
  CanvasDefinition,
  ThemeDefinition,
  LayoutMode,
} from "../../types/index.js";
import type { SpatialAnalysisResult, LayoutResult, ResolvedLayoutConfig } from "../types.js";
import { sortBlocks } from "./block-sorter.js";
import { allocateSpace } from "./space-allocator.js";
import { calculatePositions } from "./position-calculator.js";

/**
 * Orchestrates the full layout resolution pipeline:
 * 1. Sort and resolve blocks (merge styles, separate stacked vs pinned)
 * 2. Allocate vertical space for stacked blocks (with auto-scaling)
 * 3. Calculate final pixel positions for all blocks
 *
 * Returns a complete LayoutResult with every block having exact coordinates.
 */
export async function resolveLayout(
  request: RenderRequest,
  canvas: CanvasDefinition,
  theme: ThemeDefinition,
  spatialResult: SpatialAnalysisResult,
  layoutConfig?: ResolvedLayoutConfig
): Promise<LayoutResult> {
  const layoutMode: LayoutMode = request.layoutMode ?? "split";
  const textZone = layoutConfig?.textZone ?? spatialResult.textZone;
  const overlay = layoutConfig?.overlay ?? spatialResult.overlay;

  // For image-forward mode, only use pinned blocks
  let blocksToResolve = request.blocks;
  if (layoutMode === "image-forward") {
    const pinnedTypes = new Set(["disclaimer"]);
    const stackedInRequest = request.blocks.filter((b) => !pinnedTypes.has(b.type));
    if (stackedInRequest.length > 0) {
      console.warn(
        `[Layout] image-forward mode: ignoring ${stackedInRequest.length} stacked block(s)`
      );
    }
    blocksToResolve = request.blocks.filter((b) => pinnedTypes.has(b.type));
  }

  // Step 1: Resolve and sort blocks
  const { stacked, pinned } = sortBlocks(blocksToResolve, theme, layoutMode);

  // Step 2: Allocate space for stacked blocks
  const allocation = allocateSpace(stacked, textZone, theme);

  // Step 3: Calculate final positions
  const positioned = calculatePositions(
    allocation.blocks,
    pinned,
    allocation.allocatedHeights,
    textZone,
    canvas,
    theme
  );

  const availableStackedHeight = textZone.height;

  return {
    canvas,
    theme,
    backgroundImage: request.backgroundImage,
    layoutMode,
    layoutConfig: layoutConfig ?? {
      mode: layoutMode,
      textZone,
      overlay,
    },
    textZone,
    overlay,
    stackedBlocks: positioned.stacked,
    pinnedBlocks: positioned.pinned,
    metadata: {
      totalStackedHeight: allocation.totalHeight,
      availableStackedHeight,
      wasScaled: allocation.wasScaled,
      unusedSpace: Math.max(0, availableStackedHeight - allocation.totalHeight),
    },
  };
}
