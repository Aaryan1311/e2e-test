import type { PositionedBlock, QualityCheck } from "../types.js";

/**
 * Checks whether two bounding boxes intersect.
 */
function boxesIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Checks that no two blocks overlap each other.
 * Examines all pairs of stacked + pinned blocks for bounding box intersection.
 */
export function checkOverlaps(
  stackedBlocks: PositionedBlock[],
  pinnedBlocks: PositionedBlock[]
): QualityCheck {
  const allBlocks = [...stackedBlocks, ...pinnedBlocks];
  const overlaps: string[] = [];

  for (let i = 0; i < allBlocks.length; i++) {
    for (let j = i + 1; j < allBlocks.length; j++) {
      const a = allBlocks[i]!;
      const b = allBlocks[j]!;
      if (boxesIntersect(a.bounds, b.bounds)) {
        const overlapX = Math.min(a.bounds.x + a.bounds.width, b.bounds.x + b.bounds.width) -
          Math.max(a.bounds.x, b.bounds.x);
        const overlapY = Math.min(a.bounds.y + a.bounds.height, b.bounds.y + b.bounds.height) -
          Math.max(a.bounds.y, b.bounds.y);
        overlaps.push(
          `"${a.type}" and "${b.type}" overlap by ${Math.round(overlapX)}x${Math.round(overlapY)}px`
        );
      }
    }
  }

  return {
    name: "overlap",
    passed: overlaps.length === 0,
    details: overlaps.length === 0
      ? "No overlapping blocks detected"
      : `Found ${overlaps.length} overlap(s): ${overlaps.join("; ")}`,
    severity: "error",
  };
}
