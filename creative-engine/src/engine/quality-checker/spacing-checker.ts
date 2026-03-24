import type { ThemeDefinition } from "../../types/index.js";
import type { PositionedBlock, QualityCheck } from "../types.js";

/**
 * Validates minimum spacing between adjacent stacked blocks.
 * Minimum gap is at least half the configured blockGap, with a 4px floor.
 */
export function checkSpacing(
  stackedBlocks: PositionedBlock[],
  theme: ThemeDefinition
): QualityCheck {
  if (stackedBlocks.length < 2) {
    return {
      name: "spacing",
      passed: true,
      details: "Fewer than 2 stacked blocks, spacing check not applicable",
      severity: "warning",
    };
  }

  const configuredGap = parseFloat(theme.layout.blockGap) || 16;
  const minGap = Math.max(4, configuredGap * 0.5);
  const failures: string[] = [];

  // Sort by y position
  const sorted = [...stackedBlocks].sort((a, b) => a.bounds.y - b.bounds.y);

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]!;
    const next = sorted[i + 1]!;
    const gap = next.bounds.y - (current.bounds.y + current.bounds.height);

    if (gap < minGap) {
      failures.push(
        `Gap between "${current.type}" and "${next.type}" is ${Math.round(gap)}px (min: ${Math.round(minGap)}px)`
      );
    }
  }

  return {
    name: "spacing",
    passed: failures.length === 0,
    details: failures.length === 0
      ? "All block spacing meets minimum requirements"
      : `${failures.length} spacing issue(s): ${failures.join("; ")}`,
    severity: "warning",
  };
}
