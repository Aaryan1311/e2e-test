import type {
  BlockInstance,
  ThemeDefinition,
  CanvasDefinition,
  RenderRequest,
  LayoutMode,
} from "../src/types/index.js";
import { getTheme } from "../src/config/themes/index.js";
import { getCanvas } from "../src/config/canvases.js";
import { resolveSplitLayout } from "../src/engine/layout-modes/split-resolver.js";
import { resolveImageForwardLayout } from "../src/engine/layout-modes/image-forward-resolver.js";
import { resolveLayoutMode } from "../src/engine/layout-modes/index.js";
import { mergeStyles } from "../src/engine/layout-resolver/style-merger.js";
import { sortBlocks } from "../src/engine/layout-resolver/block-sorter.js";
import { getBlockDefinition } from "../src/config/blocks/registry.js";
import { resolveLayout } from "../src/engine/layout-resolver/index.js";
import { buildHtml } from "../src/engine/html-builder/index.js";
import { checkQuality } from "../src/engine/quality-checker/index.js";
import type { SpatialAnalysisResult } from "../src/engine/types.js";

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

const theme: ThemeDefinition = getTheme("everyday");
const canvas: CanvasDefinition = getCanvas("1:1");
const wideCanvas: CanvasDefinition = getCanvas("16:9");

// ============================================================
// 1. Split Mode Tests
// ============================================================
console.log("\n--- Split Mode: Content Panel Left ---");
{
  const config = resolveSplitLayout(canvas, theme);
  assert(config.mode === "split", `Mode should be "split", got "${config.mode}"`);
  assert(config.contentPanel !== undefined, "Content panel should exist");
  assert(config.imagePanel !== undefined, "Image panel should exist");
  assert(config.contentPanel!.x === 0, `Content panel x should be 0, got ${config.contentPanel!.x}`);
  assert(
    config.imagePanel!.x === config.contentPanel!.width,
    `Image panel should start at content panel width (${config.contentPanel!.width}), got ${config.imagePanel!.x}`
  );
  assert(
    config.contentPanel!.width + config.imagePanel!.width === canvas.width,
    "Panels should fill canvas width"
  );
}

console.log("\n--- Split Mode: Content Panel Right ---");
{
  const config = resolveSplitLayout(canvas, theme, { contentPanelSide: "right" });
  assert(config.contentPanel!.side === "right", "Content panel should be on right");
  assert(config.imagePanel!.x === 0, `Image panel x should be 0, got ${config.imagePanel!.x}`);
  assert(
    config.contentPanel!.x === config.imagePanel!.width,
    "Content panel should start after image panel"
  );
}

console.log("\n--- Split Mode: Custom Ratio ---");
{
  const config = resolveSplitLayout(canvas, theme, { contentPanelRatio: 0.6 });
  const expectedWidth = Math.round(canvas.width * 0.6);
  assert(
    config.contentPanel!.width === expectedWidth,
    `Content panel width should be ${expectedWidth}, got ${config.contentPanel!.width}`
  );
  assert(
    config.imagePanel!.width === canvas.width - expectedWidth,
    `Image panel width should be ${canvas.width - expectedWidth}, got ${config.imagePanel!.width}`
  );
}

console.log("\n--- Split Mode: Text Zone Within Content Panel ---");
{
  const config = resolveSplitLayout(canvas, theme);
  const cp = config.contentPanel!;
  const tz = config.textZone;

  assert(tz.x >= cp.x, `Text zone x (${tz.x}) should be >= content panel x (${cp.x})`);
  assert(
    tz.x + tz.width <= cp.x + cp.width,
    `Text zone right edge (${tz.x + tz.width}) should be <= content panel right (${cp.x + cp.width})`
  );
  assert(tz.y > 0, "Text zone y should be > 0 (below logo area)");
  assert(tz.height > 0, "Text zone height should be > 0");
  assert(tz.side === "left", `Text zone side should be "left", got "${tz.side}"`);
}

console.log("\n--- Split Mode: Infinity Bridge ---");
{
  const config = resolveSplitLayout(canvas, theme, { showInfinityBridge: true });
  assert(config.infinityBridge !== undefined, "Infinity bridge should exist");
  assert(config.infinityBridge!.width > 0, "Bridge width should be > 0");
  assert(config.infinityBridge!.height > 0, "Bridge height should be > 0");
  assert(config.infinityBridge!.svgPath.length > 0, "Bridge SVG path should not be empty");

  // Without bridge flag
  const noBridge = resolveSplitLayout(canvas, theme);
  assert(noBridge.infinityBridge === undefined, "No bridge when showInfinityBridge is false");
}

// ============================================================
// 2. Image-Overlay Mode Tests
// ============================================================
console.log("\n--- Image-Overlay Mode ---");
{
  const request: RenderRequest = {
    accountType: "everyday",
    aspectRatios: ["1:1"],
    backgroundImage: "",
    layoutMode: "image-overlay",
    blocks: [{ type: "heading", content: "Test" }],
  };
  const config = await resolveLayoutMode(request, canvas, theme);
  assert(config.mode === "image-overlay", `Mode should be "image-overlay", got "${config.mode}"`);
  assert(config.overlay !== undefined, "Overlay should exist for image-overlay mode");
  assert(config.textZone.width > 0, "Text zone should have positive width");
}

// ============================================================
// 3. Image-Forward Mode Tests
// ============================================================
console.log("\n--- Image-Forward Mode ---");
{
  const config = resolveImageForwardLayout(canvas, theme);
  assert(config.mode === "image-forward", `Mode should be "image-forward", got "${config.mode}"`);
  assert(config.overlay?.type === "none", "Overlay should be 'none' for image-forward");
  assert(config.textZone.side === "center", `Text zone side should be "center", got "${config.textZone.side}"`);
}

console.log("\n--- Image-Forward: Only Pinned Blocks ---");
{
  const request: RenderRequest = {
    accountType: "everyday",
    aspectRatios: ["1:1"],
    backgroundImage: "",
    layoutMode: "image-forward",
    blocks: [
      { type: "heading", content: "Should be ignored" },
      { type: "disclaimer", content: "Terms apply" },
    ],
  };
  const config = await resolveLayoutMode(request, canvas, theme);
  const spatialResult: SpatialAnalysisResult = {
    subjectBounds: null,
    textZone: config.textZone,
    overlay: config.overlay ?? { type: "none", css: "", opacity: 0 },
    confidence: 1.0,
  };
  const layout = await resolveLayout(request, canvas, theme, spatialResult, config);
  assert(
    layout.stackedBlocks.length === 0,
    `image-forward should have 0 stacked blocks, got ${layout.stackedBlocks.length}`
  );
  assert(
    layout.pinnedBlocks.length === 1,
    `image-forward should have 1 pinned block (disclaimer), got ${layout.pinnedBlocks.length}`
  );
}

// ============================================================
// 4. Style Merger with Layout Mode
// ============================================================
console.log("\n--- Style Merger: Layout Mode ---");
{
  const headingDef = getBlockDefinition("heading");
  const block: BlockInstance = { type: "heading", content: "Test" };

  // Split mode: heading should use splitModeBlockOverrides (white on red)
  const splitStyles = mergeStyles(block, headingDef, theme, "split");
  assert(
    splitStyles.color === "#FFFFFF",
    `Split mode heading color should be "#FFFFFF", got "${splitStyles.color}"`
  );

  // Image-overlay mode: heading should use regular blockOverrides (red)
  const overlayStyles = mergeStyles(block, headingDef, theme, "image-overlay");
  assert(
    overlayStyles.color === "#FA1432",
    `Image-overlay heading color should be "#FA1432", got "${overlayStyles.color}"`
  );

  // Request override beats splitModeBlockOverrides
  const blockWithOverride: BlockInstance = {
    type: "heading",
    content: "Test",
    styleOverrides: { color: "#00FF00" },
  };
  const overriddenStyles = mergeStyles(blockWithOverride, headingDef, theme, "split");
  assert(
    overriddenStyles.color === "#00FF00",
    `Request override should beat split overrides: expected "#00FF00", got "${overriddenStyles.color}"`
  );
}

// ============================================================
// 5. Block Sorter with Layout Mode
// ============================================================
console.log("\n--- Block Sorter: Split Mode Styles ---");
{
  const blocks: BlockInstance[] = [
    { type: "heading", content: "Test" },
    { type: "cta", content: "Click" },
  ];

  // Split mode: CTA should have inverted colors
  const { stacked: splitStacked } = sortBlocks(blocks, theme, "split");
  const ctaBlock = splitStacked.find((b) => b.type === "cta")!;
  assert(
    ctaBlock.resolvedStyles.backgroundColor === "#FFFFFF",
    `Split mode CTA bg should be "#FFFFFF", got "${ctaBlock.resolvedStyles.backgroundColor}"`
  );
  assert(
    ctaBlock.resolvedStyles.color === "#FA1432",
    `Split mode CTA text should be "#FA1432", got "${ctaBlock.resolvedStyles.color}"`
  );
}

// ============================================================
// 6. Cross-Mode Consistency
// ============================================================
console.log("\n--- Cross-Mode: Different HTML Structures ---");
{
  const request: RenderRequest = {
    accountType: "everyday",
    aspectRatios: ["1:1"],
    backgroundImage: "",
    blocks: [
      { type: "heading", content: "Test Heading" },
      { type: "cta", content: "Click" },
    ],
  };

  // Split mode layout
  const splitRequest = { ...request, layoutMode: "split" as LayoutMode };
  const splitConfig = await resolveLayoutMode(splitRequest, canvas, theme);
  const splitSpatial: SpatialAnalysisResult = {
    subjectBounds: null,
    textZone: splitConfig.textZone,
    overlay: splitConfig.overlay ?? { type: "none", css: "", opacity: 0 },
    confidence: 1.0,
  };
  const splitLayout = await resolveLayout(splitRequest, canvas, theme, splitSpatial, splitConfig);
  const splitHtml = await buildHtml(splitLayout);

  // Image-overlay mode layout
  const overlayRequest = { ...request, layoutMode: "image-overlay" as LayoutMode };
  const overlayConfig = await resolveLayoutMode(overlayRequest, canvas, theme);
  const overlaySpatial: SpatialAnalysisResult = {
    subjectBounds: null,
    textZone: overlayConfig.textZone,
    overlay: overlayConfig.overlay ?? { type: "none", css: "", opacity: 0 },
    confidence: 1.0,
  };
  const overlayLayout = await resolveLayout(
    overlayRequest, canvas, theme, overlaySpatial, overlayConfig
  );
  const overlayHtml = await buildHtml(overlayLayout);

  // Both should be valid HTML
  assert(splitHtml.includes("<!DOCTYPE html>"), "Split HTML should be valid");
  assert(overlayHtml.includes("<!DOCTYPE html>"), "Overlay HTML should be valid");

  // Split HTML should have Content Panel div
  assert(
    splitHtml.includes("Content Panel"),
    "Split HTML should contain 'Content Panel' comment"
  );

  // Both should pass quality checks
  const splitQuality = checkQuality(splitLayout);
  const overlayQuality = checkQuality(overlayLayout);
  assert(splitQuality.passed, `Split layout should pass quality (score: ${splitQuality.score})`);
  assert(overlayQuality.passed, `Overlay layout should pass quality (score: ${overlayQuality.score})`);
}

// ============================================================
// 7. Everyday Theme Validation
// ============================================================
console.log("\n--- Everyday Theme: Brand Values ---");
{
  assert(theme.colors.primary === "#FA1432", `Primary should be "#FA1432", got "${theme.colors.primary}"`);
  assert(theme.colors.secondary === "#00005A", `Secondary should be "#00005A", got "${theme.colors.secondary}"`);
  assert(theme.colors.headingColor === "#FA1432", `Heading color should be "#FA1432"`);
  assert(theme.colors.subheadingColor === "#00005A", `Subheading color should be "#00005A"`);

  // Font families
  assert(theme.typography.headingFont === "Source Sans 3", "Heading font should be Source Sans 3");
  assert(theme.typography.bodyFont === "Source Sans 3", "Body font should be Source Sans 3");

  // Block overrides
  const headingOverride = theme.blockOverrides["heading"]!;
  assert(headingOverride.fontFamily === "Source Sans 3", "Heading block should use Source Sans 3");
  assert(headingOverride.fontWeight === "700", "Heading should be Bold (700)");

  const subOverride = theme.blockOverrides["subheading"]!;
  assert(subOverride.fontFamily === "Source Serif 4", "Subheading should use Source Serif 4");
  assert(subOverride.fontWeight === "500", "Subheading should be Medium (500)");
  assert(subOverride.fontStyle === "italic", "Subheading should be italic");

  // Split mode overrides exist
  assert(
    theme.splitModeBlockOverrides !== undefined,
    "Everyday theme should have splitModeBlockOverrides"
  );
  const splitHeading = theme.splitModeBlockOverrides!["heading"]!;
  assert(splitHeading.color === "#FFFFFF", "Split heading should be white");

  const splitCta = theme.splitModeBlockOverrides!["cta"]!;
  assert(splitCta.backgroundColor === "#FFFFFF", "Split CTA bg should be white");
  assert(splitCta.color === "#FA1432", "Split CTA text should be red");
}

console.log("\n--- Solitaire & Privy Theme Validation ---");
{
  const solitaire = getTheme("solitaire");
  assert(solitaire.colors.primary === "#1A1A2E", "Solitaire primary should be deep navy");
  assert(solitaire.colors.secondary === "#C9A96E", "Solitaire secondary should be gold");
  assert(
    solitaire.splitModeBlockOverrides !== undefined,
    "Solitaire should have splitModeBlockOverrides"
  );

  const privy = getTheme("privy");
  assert(privy.colors.primary === "#00005A", "Privy primary should be dark blue");
  assert(privy.colors.secondary === "#FA1432", "Privy secondary should be red");
  assert(
    privy.splitModeBlockOverrides !== undefined,
    "Privy should have splitModeBlockOverrides"
  );
}

// ============================================================
// Summary
// ============================================================
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  throw new Error(`${failed} layout-modes test(s) failed`);
}
console.log("All layout-modes tests passed");
