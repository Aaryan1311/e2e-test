import type { CanvasDefinition } from "../../types/index.js";
import type { PositionedBlock, QualityCheck } from "../types.js";

/** Tolerance in pixels for rounding errors */
const TOLERANCE = 2;

/**
 * Checks that all blocks are within canvas bounds.
 * Allows a 2px tolerance for rounding errors.
 */
export function checkOverflow(
  allBlocks: PositionedBlock[],
  canvas: CanvasDefinition
): QualityCheck {
  const overflows: string[] = [];

  for (const block of allBlocks) {
    const { x, y, width, height } = block.bounds;
    const issues: string[] = [];

    if (x < -TOLERANCE) issues.push(`left by ${Math.abs(x)}px`);
    if (y < -TOLERANCE) issues.push(`top by ${Math.abs(y)}px`);
    if (x + width > canvas.width + TOLERANCE)
      issues.push(`right by ${Math.round(x + width - canvas.width)}px`);
    if (y + height > canvas.height + TOLERANCE)
      issues.push(`bottom by ${Math.round(y + height - canvas.height)}px`);

    if (issues.length > 0) {
      overflows.push(`"${block.type}" overflows ${issues.join(", ")}`);
    }
  }

  return {
    name: "overflow",
    passed: overflows.length === 0,
    details: overflows.length === 0
      ? "All blocks within canvas bounds"
      : `Found ${overflows.length} overflow(s): ${overflows.join("; ")}`,
    severity: "error",
  };
}
