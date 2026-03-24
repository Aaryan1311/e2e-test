import { BlockDefinitionSchema } from "../../types/block.types.js";
import type { BlockDefinition } from "../../types/block.types.js";

import { headingBlock } from "./heading.block.js";
import { subheadingBlock } from "./subheading.block.js";
import { bulletsBlock } from "./bullets.block.js";
import { ctaBlock } from "./cta.block.js";
import { offerLineBlock } from "./offer-line.block.js";
import { solutionLineBlock } from "./solution-line.block.js";
import { contactLineBlock } from "./contact-line.block.js";
import { disclaimerBlock } from "./disclaimer.block.js";
import { brandDividerBlock } from "./brand-divider.block.js";

const allBlocks: BlockDefinition[] = [
  headingBlock,
  subheadingBlock,
  bulletsBlock,
  ctaBlock,
  offerLineBlock,
  solutionLineBlock,
  contactLineBlock,
  disclaimerBlock,
  brandDividerBlock,
];

/** Central registry of all block definitions, keyed by block type */
const blockRegistry = new Map<string, BlockDefinition>();

// Validate and register all blocks at load time
for (const block of allBlocks) {
  const result = BlockDefinitionSchema.safeParse(block);
  if (!result.success) {
    throw new Error(
      `Invalid block definition "${block.type}": ${result.error.message}`
    );
  }
  if (blockRegistry.has(block.type)) {
    throw new Error(`Duplicate block type registered: "${block.type}"`);
  }
  blockRegistry.set(block.type, block);
}

/**
 * Retrieves a block definition by its type identifier.
 * @throws Error if the block type is not registered
 */
export function getBlockDefinition(type: string): BlockDefinition {
  const block = blockRegistry.get(type);
  if (!block) {
    const available = Array.from(blockRegistry.keys()).join(", ");
    throw new Error(
      `Block type "${type}" is not registered. Available types: ${available}`
    );
  }
  return block;
}

/** Returns all registered block definitions */
export function getAllBlockDefinitions(): BlockDefinition[] {
  return Array.from(blockRegistry.values());
}

/** Checks if a block type is registered */
export function isRegisteredBlock(type: string): boolean {
  return blockRegistry.has(type);
}
