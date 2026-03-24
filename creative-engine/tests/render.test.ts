import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import type {
  RenderRequest,
  ThemeDefinition,
  CanvasDefinition,
} from "../src/types/index.js";
import { getTheme } from "../src/config/themes/index.js";
import { getCanvas } from "../src/config/canvases.js";
import { buildHtml } from "../src/engine/html-builder/index.js";
import { BrowserPool } from "../src/engine/renderer/browser-pool.js";
import { generateCreatives } from "../src/engine/pipeline.js";
import { browserPool } from "../src/engine/renderer/browser-pool.js";
import { sortBlocks } from "../src/engine/layout-resolver/block-sorter.js";
import { allocateSpace } from "../src/engine/layout-resolver/space-allocator.js";
import { calculatePositions } from "../src/engine/layout-resolver/position-calculator.js";
import { calculateTextZone } from "../src/engine/spatial-analyzer/text-zone-calculator.js";
import type { LayoutResult, SpatialAnalysisResult } from "../src/engine/types.js";

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

/**
 * Creates a mock LayoutResult for testing the HTML builder without running
 * the full pipeline.
 */
function createMockLayoutResult(): LayoutResult {
  const theme = getTheme("everyday");
  const canvas = getCanvas("1:1");

  const blocks = [
    { type: "heading", content: "Test Heading" },
    { type: "subheading", content: "Test Subheading" },
    { type: "cta", content: "Click Me" },
    { type: "disclaimer", content: "Terms apply" },
  ];

  const textZone = calculateTextZone(
    { width: canvas.width, height: canvas.height },
    { x: 600, y: 50, width: 400, height: 900 },
    theme
  );

  const { stacked, pinned } = sortBlocks(blocks, theme);
  const allocation = allocateSpace(stacked, textZone, theme);
  const positions = calculatePositions(
    allocation.blocks,
    pinned,
    allocation.allocatedHeights,
    textZone,
    canvas,
    theme
  );

  return {
    canvas,
    theme,
    backgroundImage: "",
    textZone,
    overlay: {
      type: "gradient",
      direction: "to right",
      css: "linear-gradient(to right, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 70%)",
      opacity: 0.6,
    },
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
// 1. HTML Builder Tests
// ============================================================
console.log("\n--- HTML Builder Tests ---");

{
  const layout = createMockLayoutResult();
  const html = await buildHtml(layout);

  // Valid HTML document
  assert(html.includes("<!DOCTYPE html>"), "HTML should start with DOCTYPE");
  assert(html.includes("<html>"), "HTML should contain <html> tag");
  assert(html.includes("</html>"), "HTML should contain closing </html> tag");
  assert(html.includes("<body>"), "HTML should contain <body> tag");

  // Correct number of block divs (4 blocks: heading, subheading, cta, disclaimer)
  const blockDivCount = (html.match(/z-index:\s*10/g) || []).length;
  assert(
    blockDivCount >= 4,
    `Expected at least 4 block divs with z-index 10, found ${blockDivCount}`
  );

  // Background layer present (solid color fallback since no image)
  assert(
    html.includes("z-index: 1") || html.includes("z-index:1"),
    "HTML should contain background layer with z-index 1"
  );

  // Overlay CSS present (gradient type)
  assert(
    html.includes("z-index: 2") || html.includes("z-index:2"),
    "HTML should contain overlay layer with z-index 2"
  );

  // Font-face declarations present
  assert(
    html.includes("@font-face") || html.includes("font-family"),
    "HTML should contain font declarations"
  );

  // All blocks have position: absolute
  const absoluteCount = (html.match(/position:\s*absolute/g) || []).length;
  assert(
    absoluteCount >= 4,
    `Expected at least 4 position:absolute blocks, found ${absoluteCount}`
  );

  // Z-index layering: verify background(1) < overlay(2) < content(10)
  const bgIndex = html.indexOf("z-index: 1");
  const overlayIndex = html.indexOf("z-index: 2");
  const contentIndex = html.indexOf("z-index: 10");
  assert(
    bgIndex < overlayIndex && overlayIndex < contentIndex,
    "Z-index layering should be: background(1) < overlay(2) < content(10)"
  );

  // Canvas dimensions in body style
  assert(
    html.includes(`width: ${layout.canvas.width}px`),
    `HTML body should have width: ${layout.canvas.width}px`
  );
  assert(
    html.includes(`height: ${layout.canvas.height}px`),
    `HTML body should have height: ${layout.canvas.height}px`
  );
}

// Test with "none" overlay
{
  const layout = createMockLayoutResult();
  layout.overlay = { type: "none", css: "", opacity: 0 };
  const html = await buildHtml(layout);
  // "none" overlay should NOT produce a z-index: 2 div
  const overlayDivs = (html.match(/z-index:\s*2[^0-9]/g) || []).length;
  assert(
    overlayDivs === 0,
    `"none" overlay should not produce overlay div, found ${overlayDivs}`
  );
}

// ============================================================
// 2. Browser Pool Tests
// ============================================================
console.log("\n--- Browser Pool Tests ---");

{
  const pool = new BrowserPool({ maxInstances: 3, idleTimeoutMs: 5000 });

  // Pool creates browsers on demand
  const browser1 = await pool.acquire();
  assert(browser1.connected, "Acquired browser should be connected");
  const stats1 = pool.getStats();
  assert(stats1.total === 1, `Pool should have 1 browser, has ${stats1.total}`);
  assert(stats1.inUse === 1, `Pool should have 1 in-use, has ${stats1.inUse}`);

  // Pool reuses released browsers
  await pool.release(browser1);
  const browser2 = await pool.acquire();
  assert(
    browser2 === browser1,
    "Pool should reuse the released browser"
  );
  await pool.release(browser2);

  // Pool respects maxInstances
  const b1 = await pool.acquire();
  const b2 = await pool.acquire();
  const b3 = await pool.acquire();
  const stats2 = pool.getStats();
  assert(stats2.total === 3, `Pool should have 3 browsers, has ${stats2.total}`);

  let acquireFailed = false;
  try {
    await pool.acquire();
  } catch {
    acquireFailed = true;
  }
  assert(acquireFailed, "Pool should throw when maxInstances exceeded");

  await pool.release(b1);
  await pool.release(b2);
  await pool.release(b3);

  // drain() closes all browsers
  await pool.drain();
  const stats3 = pool.getStats();
  assert(stats3.total === 0, `After drain, pool should have 0 browsers, has ${stats3.total}`);
}

// ============================================================
// 3. Pipeline Integration Test
// ============================================================
console.log("\n--- Pipeline Integration Test ---");

{
  const testRequest: RenderRequest = {
    accountType: "everyday",
    aspectRatios: ["1:1", "16:9"],
    backgroundImage: "",
    blocks: [
      { type: "heading", content: "Get 50% Off on Home Loans" },
      { type: "subheading", content: "Enabling easy banking for everyone" },
      { type: "cta", content: "Apply Now" },
      { type: "disclaimer", content: "Terms and conditions apply." },
    ],
  };

  const results = await generateCreatives(testRequest);

  // Correct number of results
  assert(
    results.length === 2,
    `Expected 2 render results, got ${results.length}`
  );

  // Save for visual inspection
  const outputDir = resolve(process.cwd(), "test-output");
  await mkdir(outputDir, { recursive: true });

  for (const result of results) {
    // Non-empty image buffer
    assert(
      result.imageBuffer.length > 0,
      `Image buffer for ${result.aspectRatio} should not be empty`
    );

    // Valid metadata
    assert(
      result.metadata.textZone.width > 0,
      `Text zone width for ${result.aspectRatio} should be > 0`
    );
    assert(
      result.metadata.textZone.height > 0,
      `Text zone height for ${result.aspectRatio} should be > 0`
    );
    assert(
      result.metadata.blocksRendered.length === 4,
      `Expected 4 blocks rendered for ${result.aspectRatio}, got ${result.metadata.blocksRendered.length}`
    );

    // Verify image dimensions match canvas using sharp
    const imgMetadata = await sharp(result.imageBuffer).metadata();
    assert(
      imgMetadata.width === result.width,
      `Image width for ${result.aspectRatio}: expected ${result.width}, got ${imgMetadata.width}`
    );
    assert(
      imgMetadata.height === result.height,
      `Image height for ${result.aspectRatio}: expected ${result.height}, got ${imgMetadata.height}`
    );

    // Save to test-output
    const filename = `render-test-${result.canvasId}.png`;
    await writeFile(resolve(outputDir, filename), result.imageBuffer);
    console.log(`  Saved: test-output/${filename} (${Math.round(result.imageBuffer.length / 1024)} KB)`);
  }
}

// ============================================================
// Cleanup and Summary
// ============================================================
await browserPool.drain();

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  throw new Error(`${failed} render test(s) failed`);
}
console.log("All render tests passed");
