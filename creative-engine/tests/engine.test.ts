import type {
  BlockInstance,
  ThemeDefinition,
  CanvasDefinition,
  RenderRequest,
} from "../src/types/index.js";
import { getBlockDefinition } from "../src/config/blocks/registry.js";
import { getTheme } from "../src/config/themes/index.js";
import { getCanvas } from "../src/config/canvases.js";
import { mergeStyles } from "../src/engine/layout-resolver/style-merger.js";
import { sortBlocks } from "../src/engine/layout-resolver/block-sorter.js";
import { allocateSpace } from "../src/engine/layout-resolver/space-allocator.js";
import { calculatePositions } from "../src/engine/layout-resolver/position-calculator.js";
import { calculateTextZone } from "../src/engine/spatial-analyzer/text-zone-calculator.js";
import { resolveLayout } from "../src/engine/layout-resolver/index.js";
import type {
  SpatialAnalysisResult,
  TextZone,
  PositionedBlock,
} from "../src/engine/types.js";

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

// ============================================================
// Test fixtures
// ============================================================
const theme: ThemeDefinition = getTheme("everyday");
const canvas: CanvasDefinition = getCanvas("1:1");

function makeBlock(type: string, content: string, overrides?: Partial<BlockInstance>): BlockInstance {
  return { type, content, ...overrides };
}

// ============================================================
// 1. Style merger tests
// ============================================================
console.log("\n--- Style Merger Tests ---");

{
  const block = makeBlock("heading", "Hello World");
  const def = getBlockDefinition("heading");
  const styles = mergeStyles(block, def, theme);

  // Verify all properties are filled (no undefined)
  for (const [key, value] of Object.entries(styles)) {
    assert(value !== undefined, `mergeStyles: property "${key}" should not be undefined`);
  }

  // Verify theme override beats block default
  // everyday theme sets heading color to #FA1432
  assert(
    styles.color === "#FA1432",
    `Theme override should win: expected #FA1432, got ${styles.color}`
  );

  // Verify request override beats theme override
  const blockWithOverride = makeBlock("heading", "Hello", {
    styleOverrides: { color: "#FF0000" },
  });
  const overriddenStyles = mergeStyles(blockWithOverride, def, theme);
  assert(
    overriddenStyles.color === "#FF0000",
    `Request override should win: expected #FF0000, got ${overriddenStyles.color}`
  );

  // Verify cascade: fontFamily should come from theme override (everyday sets "Source Sans 3" for heading)
  assert(
    styles.fontFamily === "Source Sans 3",
    `Theme override fontFamily expected "Source Sans 3", got "${styles.fontFamily}"`
  );
}

// Unknown block type throws
assertThrows(
  () => mergeStyles(makeBlock("nonexistent", "x"), getBlockDefinition("nonexistent"), theme),
  "mergeStyles with unknown block type should throw"
);

// ============================================================
// 2. Block sorter tests
// ============================================================
console.log("\n--- Block Sorter Tests ---");

{
  const blocks: BlockInstance[] = [
    makeBlock("cta", "Apply Now"),
    makeBlock("heading", "Big Title"),
    makeBlock("subheading", "Subtitle"),
    makeBlock("disclaimer", "Terms and conditions apply"),
  ];

  const { stacked, pinned } = sortBlocks(blocks, theme);

  // Disclaimer is pinned
  assert(pinned.length === 1, `Expected 1 pinned block, got ${pinned.length}`);
  assert(pinned[0]!.type === "disclaimer", `Pinned block should be disclaimer, got ${pinned[0]!.type}`);

  // 3 stacked blocks
  assert(stacked.length === 3, `Expected 3 stacked blocks, got ${stacked.length}`);

  // Sorted by priority ascending: heading(10), subheading(20), cta(80)
  assert(stacked[0]!.type === "heading", `First stacked should be heading, got ${stacked[0]!.type}`);
  assert(stacked[1]!.type === "subheading", `Second stacked should be subheading, got ${stacked[1]!.type}`);
  assert(stacked[2]!.type === "cta", `Third stacked should be cta, got ${stacked[2]!.type}`);
}

// Unknown block type in sortBlocks throws
assertThrows(
  () => sortBlocks([makeBlock("nonexistent", "x")], theme),
  "sortBlocks with unknown block type should throw"
);

// ============================================================
// 3. Text zone calculator tests
// ============================================================
console.log("\n--- Text Zone Calculator Tests ---");

{
  const dims = { width: 1080, height: 1080 };

  // Subject on right → text zone on left
  const tzRight = calculateTextZone(dims, { x: 650, y: 100, width: 350, height: 800 }, theme);
  assert(tzRight.side === "left", `Subject on right → text zone should be left, got ${tzRight.side}`);
  assert(tzRight.x < dims.width / 2, "Text zone x should be on the left half");

  // Subject on left → text zone on right
  const tzLeft = calculateTextZone(dims, { x: 50, y: 100, width: 300, height: 800 }, theme);
  assert(tzLeft.side === "right", `Subject on left → text zone should be right, got ${tzLeft.side}`);
  assert(tzLeft.x > dims.width * 0.3, "Text zone x should be on the right portion");

  // Subject centered → uses theme default
  const tzCenter = calculateTextZone(dims, { x: 400, y: 100, width: 280, height: 800 }, theme);
  assert(
    tzCenter.side === theme.layout.defaultTextZoneSide,
    `Subject centered → side should be theme default "${theme.layout.defaultTextZoneSide}", got "${tzCenter.side}"`
  );

  // No subject → uses theme default
  const tzNone = calculateTextZone(dims, null, theme);
  assert(
    tzNone.side === theme.layout.defaultTextZoneSide,
    `No subject → side should be theme default, got "${tzNone.side}"`
  );

  // Width clamped between 30-70% of canvas
  const minW = Math.round(dims.width * 0.3);
  const maxW = Math.round(dims.width * 0.7);

  // Force very narrow: subject almost at left edge
  const tzNarrow = calculateTextZone(dims, { x: 0, y: 0, width: 50, height: 800 }, theme);
  assert(
    tzNarrow.width >= minW,
    `Text zone width (${tzNarrow.width}) should be >= 30% (${minW})`
  );

  // Force very wide: subject way off to the right edge
  const tzWide = calculateTextZone(dims, { x: 1050, y: 0, width: 30, height: 800 }, theme);
  assert(
    tzWide.width <= maxW,
    `Text zone width (${tzWide.width}) should be <= 70% (${maxW})`
  );
}

// ============================================================
// 4. Space allocator tests
// ============================================================
console.log("\n--- Space Allocator Tests ---");

{
  const textZone: TextZone = {
    x: 40,
    y: 100,
    width: 500,
    height: 800,
    side: "left",
  };

  // 3 blocks that easily fit
  const easyBlocks: BlockInstance[] = [
    makeBlock("heading", "Short Title"),
    makeBlock("subheading", "Short sub"),
    makeBlock("cta", "Apply"),
  ];
  const { stacked: easyStacked } = sortBlocks(easyBlocks, theme);
  const easyResult = allocateSpace(easyStacked, textZone, theme);
  assert(!easyResult.wasScaled, "3 easy blocks should not need scaling");
  assert(easyResult.totalHeight > 0, "Total height should be > 0");
  assert(
    easyResult.totalHeight <= textZone.height,
    `Total height (${easyResult.totalHeight}) should fit in zone (${textZone.height})`
  );
  assert(
    easyResult.allocatedHeights.length === 3,
    `Expected 3 allocated heights, got ${easyResult.allocatedHeights.length}`
  );

  // Many blocks that might need scaling
  const manyBlocks: BlockInstance[] = [
    makeBlock("heading", "This is a very long heading that takes up space in the layout"),
    makeBlock("subheading", "And a longer subheading that also takes space"),
    makeBlock("offer-line", "Limited time offer!"),
    makeBlock("bullets", "", { items: ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"] }),
    makeBlock("solution-line", "We provide the best banking solutions for your needs"),
    makeBlock("brand-divider", "∞"),
    makeBlock("contact-line", "1800-000-0000"),
    makeBlock("cta", "Apply Now"),
  ];
  const { stacked: manyStacked } = sortBlocks(manyBlocks, theme);

  const tinyZone: TextZone = { x: 40, y: 100, width: 300, height: 250, side: "left" };
  const tightResult = allocateSpace(manyStacked, tinyZone, theme);
  // With a very small zone, scaling should kick in
  assert(
    tightResult.wasScaled || tightResult.totalHeight <= tinyZone.height,
    "With many blocks in tiny zone, should either scale or fit"
  );

  // Single block gets reasonable height
  const singleBlocks: BlockInstance[] = [makeBlock("heading", "Title")];
  const { stacked: singleStacked } = sortBlocks(singleBlocks, theme);
  const singleResult = allocateSpace(singleStacked, textZone, theme);
  assert(
    singleResult.allocatedHeights.length === 1,
    "Single block should have 1 allocated height"
  );
  assert(
    singleResult.allocatedHeights[0]! > 0,
    "Single block height should be > 0"
  );
}

// ============================================================
// 5. Position calculator tests
// ============================================================
console.log("\n--- Position Calculator Tests ---");

{
  const textZone: TextZone = {
    x: 40,
    y: 100,
    width: 500,
    height: 800,
    side: "left",
  };

  const blocks: BlockInstance[] = [
    makeBlock("heading", "Title"),
    makeBlock("subheading", "Subtitle"),
    makeBlock("cta", "Click"),
    makeBlock("disclaimer", "Terms apply"),
  ];

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

  // Stacked blocks don't overlap
  for (let i = 1; i < positions.stacked.length; i++) {
    const prev = positions.stacked[i - 1]!;
    const curr = positions.stacked[i]!;
    assert(
      prev.bounds.y + prev.bounds.height <= curr.bounds.y,
      `Stacked blocks ${prev.type} and ${curr.type} should not overlap: ` +
        `${prev.type} ends at ${prev.bounds.y + prev.bounds.height}, ${curr.type} starts at ${curr.bounds.y}`
    );
  }

  // All stacked blocks within canvas bounds
  for (const block of positions.stacked) {
    assert(
      block.bounds.x >= 0 && block.bounds.y >= 0,
      `Block "${block.type}" position should be >= 0`
    );
    assert(
      block.bounds.x + block.bounds.width <= canvas.width,
      `Block "${block.type}" should not exceed canvas width`
    );
  }

  // Pinned disclaimer: bottom-strip spans full canvas width
  const disclaimerBlock = positions.pinned.find((b) => b.type === "disclaimer");
  assert(disclaimerBlock !== undefined, "Disclaimer should be in pinned blocks");
  if (disclaimerBlock) {
    assert(
      disclaimerBlock.bounds.x === 0,
      `Bottom-strip disclaimer x should be 0, got ${disclaimerBlock.bounds.x}`
    );
    assert(
      disclaimerBlock.bounds.width === canvas.width,
      `Bottom-strip disclaimer width should be ${canvas.width}, got ${disclaimerBlock.bounds.width}`
    );
    assert(
      disclaimerBlock.bounds.y + disclaimerBlock.bounds.height === canvas.height,
      `Bottom-strip disclaimer should be at bottom of canvas`
    );
  }
}

// ============================================================
// 6. Full integration test
// ============================================================
console.log("\n--- Integration Test ---");

{
  const integrationCanvas = getCanvas("1:1");
  const integrationTheme = getTheme("everyday");

  const spatialResult: SpatialAnalysisResult = {
    subjectBounds: { x: 600, y: 50, width: 400, height: 900 },
    textZone: calculateTextZone(
      { width: integrationCanvas.width, height: integrationCanvas.height },
      { x: 600, y: 50, width: 400, height: 900 },
      integrationTheme
    ),
    overlay: {
      type: "gradient",
      direction: "to right",
      css: "linear-gradient(to right, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 70%)",
      opacity: 0.6,
    },
    confidence: 1.0,
  };

  const request: RenderRequest = {
    accountType: "everyday",
    aspectRatios: ["1:1"],
    backgroundImage: "/test/bg.jpg",
    blocks: [
      makeBlock("heading", "Open a Savings Account"),
      makeBlock("subheading", "Start your journey with Kotak"),
      makeBlock("bullets", "", {
        items: ["Zero balance account", "Free debit card", "Online banking"],
      }),
      makeBlock("cta", "Apply Now"),
      makeBlock("disclaimer", "Terms and conditions apply. Investments are subject to market risks."),
    ],
  };

  const layoutResult = await resolveLayout(
    request,
    integrationCanvas,
    integrationTheme,
    spatialResult
  );

  // All blocks are present
  const totalBlocks =
    layoutResult.stackedBlocks.length + layoutResult.pinnedBlocks.length;
  assert(
    totalBlocks === 5,
    `Expected 5 total blocks, got ${totalBlocks}`
  );

  // 4 stacked, 1 pinned (disclaimer)
  assert(
    layoutResult.stackedBlocks.length === 4,
    `Expected 4 stacked blocks, got ${layoutResult.stackedBlocks.length}`
  );
  assert(
    layoutResult.pinnedBlocks.length === 1,
    `Expected 1 pinned block, got ${layoutResult.pinnedBlocks.length}`
  );

  // Stacked blocks are within text zone bounds
  for (const block of layoutResult.stackedBlocks) {
    assert(
      block.bounds.x >= spatialResult.textZone.x,
      `Block "${block.type}" x (${block.bounds.x}) should be >= text zone x (${spatialResult.textZone.x})`
    );
    assert(
      block.bounds.x + block.bounds.width <=
        spatialResult.textZone.x + spatialResult.textZone.width,
      `Block "${block.type}" should not exceed text zone right edge`
    );
  }

  // No stacked blocks overlap
  for (let i = 1; i < layoutResult.stackedBlocks.length; i++) {
    const prev = layoutResult.stackedBlocks[i - 1]!;
    const curr = layoutResult.stackedBlocks[i]!;
    assert(
      prev.bounds.y + prev.bounds.height <= curr.bounds.y,
      `Integration: ${prev.type} and ${curr.type} should not overlap`
    );
  }

  // Text zone is on the left (subject is on right)
  assert(
    layoutResult.textZone.side === "left",
    `Text zone should be left (subject on right), got ${layoutResult.textZone.side}`
  );

  // Canvas and theme are correct
  assert(layoutResult.canvas.id === "square_1x1", "Canvas should be square_1x1");
  assert(layoutResult.theme.id === "everyday", "Theme should be everyday");

  // Metadata is populated
  assert(
    layoutResult.metadata.totalStackedHeight > 0,
    "Total stacked height should be > 0"
  );
  assert(
    layoutResult.metadata.availableStackedHeight > 0,
    "Available stacked height should be > 0"
  );
}

// ============================================================
// Summary
// ============================================================
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  throw new Error(`${failed} engine test(s) failed`);
}
console.log("All engine tests passed");
