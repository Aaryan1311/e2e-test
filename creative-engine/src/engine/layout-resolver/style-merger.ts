import type {
  BlockInstance,
  BlockDefinition,
  BlockStyles,
  ThemeDefinition,
} from "../../types/index.js";

/**
 * Merges block styles using a three-level cascade:
 *   Level 1 (lowest): BlockDefinition.defaultStyles
 *   Level 2: ThemeDefinition.blockOverrides[blockType]
 *   Level 3 (highest): BlockInstance.styleOverrides
 *
 * Any remaining undefined properties are filled with sensible global defaults
 * derived from the theme, ensuring every property has a value.
 */
export function mergeStyles(
  block: BlockInstance,
  definition: BlockDefinition,
  theme: ThemeDefinition
): Required<BlockStyles> {
  // Global defaults — the safety net for any property not set at any level
  const globalDefaults: Required<BlockStyles> = {
    fontFamily: theme.typography.bodyFont,
    fontSize: theme.typography.baseFontSize,
    fontWeight: "normal",
    fontStyle: "normal",
    lineHeight: 1.4,
    letterSpacing: "0px",
    color: theme.colors.bodyColor,
    backgroundColor: "transparent",
    textAlign: "left",
    textTransform: "none",
    padding: "0",
    margin: "0",
    borderRadius: "0",
    maxWidth: "100%",
    opacity: 1,
  };

  // Level 1: Block definition defaults
  const level1 = definition.defaultStyles;

  // Level 2: Theme overrides for this block type
  const level2 = theme.blockOverrides[definition.type] ?? {};

  // Level 3: Per-request overrides
  const level3 = block.styleOverrides ?? {};

  // Merge: later levels override earlier levels per-property
  const merged: Required<BlockStyles> = { ...globalDefaults };

  for (const key of Object.keys(globalDefaults) as Array<keyof BlockStyles>) {
    if (level1[key] !== undefined) {
      (merged as Record<string, unknown>)[key] = level1[key];
    }
    if (level2[key] !== undefined) {
      (merged as Record<string, unknown>)[key] = level2[key];
    }
    if (level3[key] !== undefined) {
      (merged as Record<string, unknown>)[key] = level3[key];
    }
  }

  return merged;
}
