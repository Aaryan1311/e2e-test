import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { getAllBlockDefinitions, isRegisteredBlock } from "./config/blocks/registry.js";
import { getAllThemes } from "./config/themes/index.js";
import { getAllCanvases } from "./config/canvases.js";
import { generateCreatives } from "./engine/pipeline.js";
import { browserPool } from "./engine/renderer/browser-pool.js";
import type { RenderRequest } from "./types/index.js";

async function main(): Promise<void> {
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
  console.log("Configuration is healthy. Running end-to-end smoke test...\n");

  // End-to-end smoke test
  const testRequest: RenderRequest = {
    accountType: "everyday",
    aspectRatios: ["1:1", "16:9"],
    backgroundImage: "",
    blocks: [
      { type: "heading", content: "Get 50% Off on Home Loans" },
      { type: "subheading", content: "Enabling easy banking for everyone" },
      { type: "cta", content: "Apply Now" },
      { type: "disclaimer", content: "Terms and conditions apply. Offer valid till March 2026." },
    ],
  };

  try {
    const results = await generateCreatives(testRequest);

    // Save output PNGs
    const outputDir = resolve(process.cwd(), "test-output");
    await mkdir(outputDir, { recursive: true });

    for (const result of results) {
      const filename = `smoke-test-${result.canvasId}.png`;
      const filePath = resolve(outputDir, filename);
      await writeFile(filePath, result.imageBuffer);
      const sizeKb = Math.round(result.imageBuffer.length / 1024);
      console.log(`  Saved: ${filePath} (${sizeKb} KB, ${result.width}x${result.height})`);
    }

    console.log(`\nSmoke test complete — ${results.length} images generated.`);
  } catch (error) {
    console.error("Smoke test failed:", error);
  } finally {
    await browserPool.drain();
  }
}

main().catch(console.error);
