import { ThemeDefinitionSchema } from "../../types/theme.types.js";
import type { ThemeDefinition } from "../../types/theme.types.js";

import { everydayTheme } from "./everyday.theme.js";
import { solitaireTheme } from "./solitaire.theme.js";
import { privyTheme } from "./privy.theme.js";

const allThemes: ThemeDefinition[] = [everydayTheme, solitaireTheme, privyTheme];

/** Central registry of all theme definitions, keyed by theme id */
const themeRegistry = new Map<string, ThemeDefinition>();

// Validate and register all themes at load time
for (const theme of allThemes) {
  const result = ThemeDefinitionSchema.safeParse(theme);
  if (!result.success) {
    throw new Error(
      `Invalid theme definition "${theme.id}": ${result.error.message}`
    );
  }
  if (themeRegistry.has(theme.id)) {
    throw new Error(`Duplicate theme id registered: "${theme.id}"`);
  }
  themeRegistry.set(theme.id, theme);
}

/**
 * Retrieves a theme definition by its id.
 * @throws Error if the theme id is not registered
 */
export function getTheme(id: string): ThemeDefinition {
  const theme = themeRegistry.get(id);
  if (!theme) {
    const available = Array.from(themeRegistry.keys()).join(", ");
    throw new Error(
      `Theme "${id}" is not registered. Available themes: ${available}`
    );
  }
  return theme;
}

/** Returns all registered theme definitions */
export function getAllThemes(): ThemeDefinition[] {
  return Array.from(themeRegistry.values());
}

/** Checks if a theme id is registered */
export function isRegisteredTheme(id: string): boolean {
  return themeRegistry.has(id);
}
