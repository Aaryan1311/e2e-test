import type {
  RenderRequest,
  CanvasDefinition,
  ThemeDefinition,
} from "../../types/index.js";
import type { SpatialAnalysisResult, LayoutResult } from "../types.js";
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
  spatialResult: SpatialAnalysisResult
): Promise<LayoutResult> {
  // Step 1: Resolve and sort blocks
  const { stacked, pinned } = sortBlocks(request.blocks, theme);

  // Step 2: Allocate space for stacked blocks
  const allocation = allocateSpace(
    stacked,
    spatialResult.textZone,
    theme
  );

  // Step 3: Calculate final positions
  const positioned = calculatePositions(
    allocation.blocks,
    pinned,
    allocation.allocatedHeights,
    spatialResult.textZone,
    canvas,
    theme
  );

  const availableStackedHeight = spatialResult.textZone.height;

  return {
    canvas,
    theme,
    backgroundImage: request.backgroundImage,
    textZone: spatialResult.textZone,
    overlay: spatialResult.overlay,
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
