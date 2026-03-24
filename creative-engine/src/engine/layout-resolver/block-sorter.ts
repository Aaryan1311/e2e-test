import type { BlockInstance, ThemeDefinition } from "../../types/index.js";
import { getBlockDefinition } from "../../config/blocks/registry.js";
import { mergeStyles } from "./style-merger.js";
import type { ResolvedBlock } from "../types.js";

/**
 * Resolves block instances into fully typed ResolvedBlocks, then separates
 * them into stacked (sorted by priority ascending) and pinned groups.
 *
 * @throws Error if any block type is not found in the registry
 */
export function sortBlocks(
  blocks: BlockInstance[],
  theme: ThemeDefinition
): { stacked: ResolvedBlock[]; pinned: ResolvedBlock[] } {
  const resolved: ResolvedBlock[] = blocks.map((block) => {
    const definition = getBlockDefinition(block.type);
    const resolvedStyles = mergeStyles(block, definition, theme);

    return {
      type: block.type,
      content: block.content,
      items: block.items,
      definition,
      resolvedStyles,
      positionMode: definition.positionMode,
      pinPosition: definition.pinPosition,
      priority: definition.priority,
    };
  });

  const stacked = resolved
    .filter((b) => b.positionMode === "stacked")
    .sort((a, b) => a.priority - b.priority);

  const pinned = resolved.filter((b) => b.positionMode === "pinned");

  return { stacked, pinned };
}
