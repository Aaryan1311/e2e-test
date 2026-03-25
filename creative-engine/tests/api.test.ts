import request from "supertest";
import { resolve } from "node:path";
import type { CanvasDefinition, ThemeDefinition, BlockInstance } from "../src/types/index.js";
import { getTheme } from "../src/config/themes/index.js";
import { getCanvas } from "../src/config/canvases.js";
import { createServer } from "../src/api/server.js";
import { checkQuality } from "../src/engine/quality-checker/index.js";
import { checkOverlaps } from "../src/engine/quality-checker/overlap-checker.js";
import { checkOverflow } from "../src/engine/quality-checker/overflow-checker.js";
import { checkFontSizes } from "../src/engine/quality-checker/font-size-checker.js";
import { checkSpacing } from "../src/engine/quality-checker/spacing-checker.js";
import { checkContrast } from "../src/engine/quality-checker/contrast-checker.js";
import { sortBlocks } from "../src/engine/layout-resolver/block-sorter.js";
import { allocateSpace } from "../src/engine/layout-resolver/space-allocator.js";
import { calculatePositions } from "../src/engine/layout-resolver/position-calculator.js";
import { calculateTextZone } from "../src/engine/spatial-analyzer/text-zone-calculator.js";
import { browserPool } from "../src/engine/renderer/browser-pool.js";
import type { LayoutResult, PositionedBlock, OverlayConfig } from "../src/engine/types.js";

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

// Helpers
const theme: ThemeDefinition = getTheme("everyday");
const canvas: CanvasDefinition = getCanvas("1:1");
const TEST_IMAGE = resolve(process.cwd(), "test-assets", "test-image-travel.png");

function makePositionedBlock(
  type: string,
  x: number, y: number, w: number, h: number,
  overrides?: Partial<PositionedBlock>
): PositionedBlock {
  const blocks: BlockInstance[] = [{ type, content: "test" }];
  const { stacked, pinned } = sortBlocks(blocks, theme);
  const base = stacked[0] ?? pinned[0]!;
  return {
    ...base,
    bounds: { x, y, width: w, height: h },
    ...overrides,
  } as PositionedBlock;
}

function createValidLayout(): LayoutResult {
  const textZone = calculateTextZone(
    { width: canvas.width, height: canvas.height },
    { x: 600, y: 50, width: 400, height: 900 },
    theme
  );
  const blocks: BlockInstance[] = [
    { type: "heading", content: "Test Heading" },
    { type: "subheading", content: "Sub" },
    { type: "cta", content: "Click" },
    { type: "disclaimer", content: "Terms" },
  ];
  const { stacked, pinned } = sortBlocks(blocks, theme);
  const allocation = allocateSpace(stacked, textZone, theme);
  const positions = calculatePositions(
    allocation.blocks, pinned, allocation.allocatedHeights,
    textZone, canvas, theme
  );
  return {
    canvas, theme, backgroundImage: "",
    textZone,
    overlay: { type: "gradient", direction: "to right", css: "linear-gradient(to right, rgba(255,255,255,0.9), transparent)", opacity: 0.6 },
    stackedBlocks: positions.stacked,
    pinnedBlocks: positions.pinned,
    metadata: {
      totalStackedHeight: allocation.totalHeight,
      availableStackedHeight: textZone.height,
      wasScaled: allocation.wasScaled,
      unusedSpace: Math.max(0, textZone.height - allocation.totalHeight),
    },
  };
}

// ============================================================
// 1. Quality Checker Tests
// ============================================================
console.log("\n--- Quality Checker: Overlap ---");
{
  // Two blocks that clearly overlap
  const a = makePositionedBlock("heading", 10, 10, 200, 100);
  const b = makePositionedBlock("subheading", 50, 50, 200, 100);
  const result = checkOverlaps([a, b], []);
  assert(!result.passed, "Overlap checker should detect overlapping blocks");
  assert(result.severity === "error", "Overlap should be error severity");

  // Non-overlapping
  const c = makePositionedBlock("heading", 10, 10, 200, 50);
  const d = makePositionedBlock("subheading", 10, 100, 200, 50);
  const result2 = checkOverlaps([c, d], []);
  assert(result2.passed, "Non-overlapping blocks should pass");
}

console.log("\n--- Quality Checker: Overflow ---");
{
  // Block extends beyond canvas
  const overflowBlock = makePositionedBlock("heading", 900, 900, 300, 300);
  const result = checkOverflow([overflowBlock], canvas);
  assert(!result.passed, "Overflow checker should detect block outside canvas");

  // Block within bounds
  const okBlock = makePositionedBlock("heading", 10, 10, 200, 100);
  const result2 = checkOverflow([okBlock], canvas);
  assert(result2.passed, "Block within bounds should pass");
}

console.log("\n--- Quality Checker: Font Size ---");
{
  const tinyBlock = makePositionedBlock("heading", 10, 10, 200, 50, {
    resolvedStyles: {
      ...makePositionedBlock("heading", 0, 0, 0, 0).resolvedStyles,
      fontSize: "6px",
    },
  });
  const result = checkFontSizes([tinyBlock]);
  assert(!result.passed, "Font size checker should catch 6px heading");
  assert(result.severity === "error", "Font size should be error severity");

  const disclaimerBlock = makePositionedBlock("disclaimer", 0, 1040, 1080, 40, {
    resolvedStyles: {
      ...makePositionedBlock("disclaimer", 0, 0, 0, 0).resolvedStyles,
      fontSize: "6px",
    },
  });
  const result2 = checkFontSizes([disclaimerBlock]);
  assert(result2.passed, "6px disclaimer should be OK");
}

console.log("\n--- Quality Checker: Spacing ---");
{
  const a = makePositionedBlock("heading", 10, 10, 200, 50);
  const b = makePositionedBlock("subheading", 10, 62, 200, 50);
  const result = checkSpacing([a, b], theme);
  assert(!result.passed, "Spacing checker should warn about 2px gap");
  assert(result.severity === "warning", "Spacing should be warning severity");
}

console.log("\n--- Quality Checker: Contrast ---");
{
  const whiteBlock = makePositionedBlock("heading", 10, 10, 200, 50, {
    resolvedStyles: {
      ...makePositionedBlock("heading", 0, 0, 0, 0).resolvedStyles,
      color: "#FFFFFF",
      fontSize: "16px",
    },
  });
  const brightOverlay: OverlayConfig = {
    type: "solid",
    css: "rgba(255,255,255,0.9)",
    opacity: 0.9,
  };
  const brightTheme = { ...theme, colors: { ...theme.colors, primary: "#FFFFFF" } } as ThemeDefinition;
  const result = checkContrast([whiteBlock], brightOverlay, brightTheme);
  assert(!result.passed, "White text on white background should warn about contrast");
  assert(result.severity === "warning", "Contrast should be warning severity");
}

console.log("\n--- Quality Checker: Valid Layout ---");
{
  const layout = createValidLayout();
  const result = checkQuality(layout);
  assert(result.score > 0, `Quality score should be > 0, got ${result.score}`);
  assert(result.checks.length === 5, `Should have 5 checks, got ${result.checks.length}`);

  const errorChecks = result.checks.filter((c) => c.severity === "error");
  const errorsPassed = errorChecks.every((c) => c.passed);
  assert(errorsPassed, "All error-severity checks should pass for valid layout");
}

// ============================================================
// 2. API Tests
// ============================================================
console.log("\n--- API Tests ---");

const app = createServer();

{
  // GET /health
  const res = await request(app).get("/health");
  assert(res.status === 200, `GET /health status should be 200, got ${res.status}`);
  assert(res.body.success === true, "Health response should have success: true");
  assert(res.body.data.status === "healthy", "Health status should be healthy");
  assert(res.body.data.configs.blocks === 9, `Should have 9 blocks, got ${res.body.data.configs.blocks}`);

  // GET /config/blocks
  const blocksRes = await request(app).get("/config/blocks");
  assert(blocksRes.status === 200, `GET /config/blocks status should be 200`);
  assert(blocksRes.body.data.blocks.length === 9, `Should have 9 blocks`);

  // GET /config/themes
  const themesRes = await request(app).get("/config/themes");
  assert(themesRes.status === 200, `GET /config/themes status should be 200`);
  assert(themesRes.body.data.themes.length === 3, `Should have 3 themes`);

  // GET /config/canvases
  const canvasesRes = await request(app).get("/config/canvases");
  assert(canvasesRes.status === 200, `GET /config/canvases status should be 200`);
  assert(canvasesRes.body.data.canvases.length === 9, `Should have 9 canvases`);

  // GET /config/blocks/heading
  const headingRes = await request(app).get("/config/blocks/heading");
  assert(headingRes.status === 200, `GET /config/blocks/heading should be 200`);
  assert(headingRes.body.data.type === "heading", "Should return heading block");

  // GET /config/blocks/nonexistent → 404
  const notFoundRes = await request(app).get("/config/blocks/nonexistent");
  assert(notFoundRes.status === 400 || notFoundRes.status === 404, `Nonexistent block should be 400 or 404, got ${notFoundRes.status}`);
  assert(notFoundRes.body.success === false, "Not found should have success: false");

  // GET /config/themes/everyday
  const themeRes = await request(app).get("/config/themes/everyday");
  assert(themeRes.status === 200, `GET /config/themes/everyday should be 200`);
  assert(themeRes.body.data.id === "everyday", "Should return everyday theme");

  // POST /render with missing accountType → 400
  const badReqRes = await request(app)
    .post("/render")
    .send({ blocks: [{ type: "heading", content: "test" }] });
  assert(badReqRes.status === 400, `Missing accountType should be 400, got ${badReqRes.status}`);

  // POST /render with empty blocks → 400
  const emptyBlocksRes = await request(app)
    .post("/render")
    .send({ accountType: "everyday", backgroundImage: TEST_IMAGE, blocks: [] });
  assert(emptyBlocksRes.status === 400, `Empty blocks should be 400, got ${emptyBlocksRes.status}`);

  // POST /preview returns HTML
  const previewRes = await request(app)
    .post("/preview")
    .send({
      accountType: "everyday",
      backgroundImage: TEST_IMAGE,
      blocks: [{ type: "heading", content: "Preview Test" }],
    });
  assert(previewRes.status === 200, `POST /preview should be 200, got ${previewRes.status}`);
  assert(previewRes.body.data.html.includes("<!DOCTYPE html>"), "Preview should return HTML");
  assert(previewRes.body.data.qualityCheck !== undefined, "Preview should include quality check");

  // POST /render with valid request — singular render response
  const renderRes = await request(app)
    .post("/render")
    .send({
      accountType: "everyday",
      backgroundImage: TEST_IMAGE,
      blocks: [
        { type: "heading", content: "Test Render" },
        { type: "cta", content: "Go" },
      ],
    })
    .timeout(30000);
  assert(renderRes.status === 200, `POST /render should be 200, got ${renderRes.status}`);
  assert(renderRes.body.data.render !== undefined, "Should have render (singular) in response");
  assert(renderRes.body.data.render.width === 1920, `Width should be 1920 (from test image), got ${renderRes.body.data.render.width}`);
  assert(renderRes.body.data.render.height === 1280, `Height should be 1280 (from test image), got ${renderRes.body.data.render.height}`);
  assert(
    renderRes.body.data.render.imageBase64.length > 0,
    "Should have non-empty base64 image"
  );
}

// Rate limiter test
console.log("\n--- Rate Limiter Test ---");
{
  const res = await request(app).get("/health");
  assert(res.status === 200, "Health check should still work within rate limit");
}

// ============================================================
// Cleanup and Summary
// ============================================================
await browserPool.drain();

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  throw new Error(`${failed} API test(s) failed`);
}
console.log("All API tests passed");
