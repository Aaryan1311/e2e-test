import {
  BlockDefinitionSchema,
  ThemeDefinitionSchema,
  CanvasDefinitionSchema,
} from "../src/types/index.js";
import {
  getAllBlockDefinitions,
  getBlockDefinition,
  isRegisteredBlock,
} from "../src/config/blocks/registry.js";
import { getAllThemes, getTheme } from "../src/config/themes/index.js";
import { getAllCanvases, getCanvas } from "../src/config/canvases.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

function assertThrows(fn: () => void, message: string): void {
  try {
    fn();
    failed++;
    console.error(`FAIL: Expected error — ${message}`);
  } catch {
    passed++;
  }
}

// 1. All block definitions load and pass Zod validation
const blocks = getAllBlockDefinitions();
assert(blocks.length === 9, `Expected 9 block definitions, got ${blocks.length}`);

for (const block of blocks) {
  const result = BlockDefinitionSchema.safeParse(block);
  assert(result.success, `Block "${block.type}" failed Zod validation: ${result.success ? "" : result.error.message}`);
}

// 2. All themes load and pass Zod validation
const themes = getAllThemes();
assert(themes.length === 3, `Expected 3 themes, got ${themes.length}`);

for (const theme of themes) {
  const result = ThemeDefinitionSchema.safeParse(theme);
  assert(result.success, `Theme "${theme.id}" failed Zod validation: ${result.success ? "" : result.error.message}`);
}

// 3. All canvases load and pass Zod validation
const canvases = getAllCanvases();
assert(canvases.length === 9, `Expected 9 canvases, got ${canvases.length}`);

for (const canvas of canvases) {
  const result = CanvasDefinitionSchema.safeParse(canvas);
  assert(result.success, `Canvas "${canvas.id}" failed Zod validation: ${result.success ? "" : result.error.message}`);
}

// 4. Block registry returns correct definitions
assert(getBlockDefinition("heading").type === "heading", "getBlockDefinition('heading') should return heading block");
assert(getBlockDefinition("cta").type === "cta", "getBlockDefinition('cta') should return cta block");
assert(isRegisteredBlock("heading") === true, "isRegisteredBlock('heading') should be true");
assert(isRegisteredBlock("nonexistent") === false, "isRegisteredBlock('nonexistent') should be false");
assertThrows(() => getBlockDefinition("nonexistent"), "getBlockDefinition should throw for unregistered type");

// Theme registry
assert(getTheme("everyday").id === "everyday", "getTheme('everyday') should return everyday theme");
assertThrows(() => getTheme("nonexistent"), "getTheme should throw for unregistered theme");

// Canvas registry
assert(getCanvas("1:1").id === "square_1x1", "getCanvas('1:1') should return square canvas");
assertThrows(() => getCanvas("99:99"), "getCanvas should throw for unregistered aspect ratio");

// 5. Theme block overrides only reference registered block types
for (const theme of themes) {
  for (const blockType of Object.keys(theme.blockOverrides)) {
    assert(
      isRegisteredBlock(blockType),
      `Theme "${theme.id}" references unregistered block type "${blockType}"`
    );
  }
}

// 6. No two stacked blocks have the same priority (warn if they do)
const stackedBlocks = blocks.filter((b) => b.positionMode === "stacked");
const priorityMap = new Map<number, string[]>();
for (const block of stackedBlocks) {
  const existing = priorityMap.get(block.priority) ?? [];
  existing.push(block.type);
  priorityMap.set(block.priority, existing);
}
for (const [priority, types] of priorityMap) {
  if (types.length > 1) {
    console.warn(
      `WARNING: Stacked blocks with duplicate priority ${priority}: ${types.join(", ")}`
    );
  }
}
assert(
  Array.from(priorityMap.values()).every((t) => t.length === 1),
  "All stacked blocks should have unique priorities"
);

// 7. Canvases cover all 9 expected aspect ratios
const expectedRatios = ["1:1", "9:16", "16:9", "4:5", "3:4", "2:1", "1:2", "728:90", "3:1"];
const canvasRatios = new Set(canvases.map((c) => c.aspectRatio));
for (const ratio of expectedRatios) {
  assert(canvasRatios.has(ratio), `Expected canvas for aspect ratio "${ratio}"`);
}

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  throw new Error(`${failed} test(s) failed`);
}
console.log("All config tests passed");
