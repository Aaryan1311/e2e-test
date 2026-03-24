import { getAllBlockDefinitions, isRegisteredBlock } from "./config/blocks/registry.js";
import { getAllThemes } from "./config/themes/index.js";
import { getAllCanvases } from "./config/canvases.js";

function main(): void {
  // Load all configs — these throw on validation failure
  const blocks = getAllBlockDefinitions();
  const themes = getAllThemes();
  const canvases = getAllCanvases();

  console.log(
    `Creative Engine initialized — ${blocks.length} block types, ${themes.length} themes, ${canvases.length} canvases loaded`
  );

  // Validate that every block type referenced in theme blockOverrides exists
  for (const theme of themes) {
    for (const blockType of Object.keys(theme.blockOverrides)) {
      if (!isRegisteredBlock(blockType)) {
        throw new Error(
          `Theme "${theme.id}" references unregistered block type "${blockType}" in blockOverrides`
        );
      }
    }
  }

  console.log("All theme block overrides reference valid block types.");
  console.log("Configuration is healthy. Ready for Phase 2.");
}

main();
