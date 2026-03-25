/**
 * Visual QA Script — Phase 6 (Simplified Flow)
 *
 * One image in → one image out. The image IS the canvas.
 * Generates creatives using the singular generateCreative pipeline.
 *
 * Output goes to test-output/visual-qa/ for human inspection.
 */
import { writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import type { RenderRequest } from "../src/types/index.js";
import { generateCreative } from "../src/engine/pipeline.js";
import { browserPool } from "../src/engine/renderer/browser-pool.js";

const IMAGE_PATH = "./test-assets/test-image-travel.png";
const OUTPUT_BASE = resolve(process.cwd(), "test-output", "visual-qa");
const OUTPUTS_DIR = "/mnt/user-data/outputs";

interface TestCase {
  id: string;
  name: string;
  outputName: string;
  request: RenderRequest;
}

// ============================================================
// Test Definitions — One image in, one image out
// ============================================================

const testCases: TestCase[] = [
  // Test 1: Split mode — heading + subheading only
  {
    id: "test1",
    name: "Split: heading + subheading (minimal)",
    outputName: "test1-split-minimal.png",
    request: {
      accountType: "everyday",
      layoutMode: "split",
      backgroundImage: IMAGE_PATH,
      blocks: [
        { type: "heading", content: "Your journey to financial freedom" },
        { type: "subheading", content: "starts with the right savings plan" },
      ],
    },
  },

  // Test 2: Split mode — heading + subheading + CTA
  {
    id: "test2",
    name: "Split: heading + subheading + CTA",
    outputName: "test2-split-cta.png",
    request: {
      accountType: "everyday",
      layoutMode: "split",
      backgroundImage: IMAGE_PATH,
      blocks: [
        { type: "heading", content: "Travel Savings Account" },
        { type: "subheading", content: "for the explorer in you" },
        { type: "cta", content: "Open Account Now" },
      ],
    },
  },

  // Test 3: Split mode — heading + subheading + bullets + CTA + disclaimer
  {
    id: "test3",
    name: "Split: content-heavy (bullets + CTA + disclaimer)",
    outputName: "test3-split-heavy.png",
    request: {
      accountType: "everyday",
      layoutMode: "split",
      backgroundImage: IMAGE_PATH,
      blocks: [
        { type: "heading", content: "Travel Savings Account" },
        { type: "subheading", content: "for the explorer in you" },
        {
          type: "bullets",
          content: "",
          items: [
            "Zero forex markup on international spends",
            "Complimentary travel insurance up to ₹50 Lakhs",
            "Airport lounge access worldwide",
            "24/7 travel assistance helpline",
          ],
        },
        { type: "cta", content: "Open Account Now" },
        {
          type: "disclaimer",
          content:
            "Kotak Mahindra Bank Ltd. | CIN: L65110MH1985PLC038137. Terms and conditions apply.",
        },
      ],
    },
  },

  // Test 4: Image-overlay — heading + subheading + CTA (with subject position)
  {
    id: "test4",
    name: "Overlay: with subject position",
    outputName: "test4-overlay-subject.png",
    request: {
      accountType: "everyday",
      layoutMode: "image-overlay",
      backgroundImage: IMAGE_PATH,
      subjectPosition: { x: 850, y: 100, width: 400, height: 600 },
      blocks: [
        { type: "heading", content: "Your journey to financial freedom" },
        { type: "subheading", content: "starts with the right savings plan" },
        { type: "cta", content: "Open Account" },
      ],
    },
  },

  // Test 5: Image-overlay — without subject position (heuristic)
  {
    id: "test5",
    name: "Overlay: heuristic subject detection",
    outputName: "test5-overlay-heuristic.png",
    request: {
      accountType: "everyday",
      layoutMode: "image-overlay",
      backgroundImage: IMAGE_PATH,
      blocks: [
        { type: "heading", content: "Adventure Awaits" },
        { type: "subheading", content: "and so does smart banking" },
      ],
    },
  },

  // Test 6: Split mode with includeLogo: false
  {
    id: "test6",
    name: "Split: no logo",
    outputName: "test6-split-nologo.png",
    request: {
      accountType: "everyday",
      layoutMode: "split",
      backgroundImage: IMAGE_PATH,
      includeLogo: false,
      blocks: [
        { type: "heading", content: "Save More Travel More" },
        { type: "subheading", content: "with Kotak Everyday Account" },
        { type: "cta", content: "Get Started" },
      ],
    },
  },

  // Test 7: Split mode with content panel on right
  {
    id: "test7",
    name: "Split: content panel RIGHT",
    outputName: "test7-split-right.png",
    request: {
      accountType: "everyday",
      layoutMode: "split",
      splitConfig: { contentPanelSide: "right", contentPanelRatio: 0.5 },
      backgroundImage: IMAGE_PATH,
      blocks: [
        { type: "heading", content: "Save More Travel More" },
        { type: "subheading", content: "with Kotak Everyday Account" },
        { type: "cta", content: "Get Started" },
      ],
    },
  },
];

// ============================================================
// Runner
// ============================================================

interface RenderSummary {
  testId: string;
  testName: string;
  width: number;
  height: number;
  qualityScore: number;
  warnings: string[];
  filePath: string;
  fileSize: number;
  renderTimeMs: number;
  success: boolean;
  error?: string;
}

async function main(): Promise<void> {
  // Verify test image
  try {
    const meta = await sharp(IMAGE_PATH).metadata();
    console.log(
      `\nTest image: ${meta.width}x${meta.height} ${meta.format} (${IMAGE_PATH})`
    );
  } catch (err) {
    console.error("Failed to read test image:", err);
    process.exit(1);
  }

  await mkdir(OUTPUT_BASE, { recursive: true });

  const summaries: RenderSummary[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const test of testCases) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`${test.id}: ${test.name}`);
    console.log(`Mode: ${test.request.layoutMode ?? "split"}`);
    console.log(`${"═".repeat(60)}`);

    const start = performance.now();

    try {
      const result = await generateCreative(test.request);
      const elapsed = Math.round(performance.now() - start);

      const filePath = resolve(OUTPUT_BASE, test.outputName);
      await writeFile(filePath, result.imageBuffer);
      const fileSizeKb = Math.round(result.imageBuffer.length / 1024);

      const qualityChecks = result.metadata.qualityChecks ?? {};
      const failedChecks = Object.entries(qualityChecks)
        .filter(([, passed]) => !passed)
        .map(([name]) => name);

      const errorChecks = failedChecks.filter(
        (n) => n === "overlap" || n === "overflow" || n === "font-size"
      );
      const warningChecks = failedChecks.filter(
        (n) => n === "contrast" || n === "spacing"
      );
      const score = Math.max(
        0,
        100 - errorChecks.length * 30 - warningChecks.length * 10
      );

      const warnings = failedChecks.map(
        (c) => `${test.id}: quality check "${c}" failed`
      );

      console.log(
        `  ✓ ${result.width}x${result.height} | ` +
          `quality=${score} | ${fileSizeKb}KB | ${test.outputName} | ${elapsed}ms`
      );
      if (warnings.length > 0) {
        for (const w of warnings) console.log(`    ⚠ ${w}`);
      }

      summaries.push({
        testId: test.id,
        testName: test.name,
        width: result.width,
        height: result.height,
        qualityScore: score,
        warnings,
        filePath,
        fileSize: result.imageBuffer.length,
        renderTimeMs: elapsed,
        success: true,
      });

      successCount++;
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ FAILED (${elapsed}ms): ${errorMsg}`);

      failCount++;
      summaries.push({
        testId: test.id,
        testName: test.name,
        width: 0,
        height: 0,
        qualityScore: 0,
        warnings: [],
        filePath: "",
        fileSize: 0,
        renderTimeMs: elapsed,
        success: false,
        error: errorMsg,
      });
    }
  }

  // ============================================================
  // Summary
  // ============================================================
  const scores = summaries
    .filter((s) => s.success)
    .map((s) => s.qualityScore);
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  const allWarnings = summaries.flatMap((s) => s.warnings);

  console.log(`\n${"═".repeat(60)}`);
  console.log("Visual QA Summary");
  console.log(`${"═".repeat(60)}`);
  console.log(`Total renders: ${testCases.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Quality scores: min=${minScore}, avg=${avgScore}, max=${maxScore}`);

  if (allWarnings.length > 0) {
    console.log(`\nWarnings:`);
    for (const w of allWarnings) {
      console.log(`  - ${w}`);
    }
  }

  console.log(`\nOutput directory: ${OUTPUT_BASE}/`);
  console.log(`${"═".repeat(60)}`);

  // Copy outputs to /mnt/user-data/outputs/ if it exists
  try {
    await mkdir(OUTPUTS_DIR, { recursive: true });
    for (const summary of summaries) {
      if (summary.success) {
        const dest = resolve(OUTPUTS_DIR, `qa-${summary.testId}.png`);
        await copyFile(summary.filePath, dest);
      }
    }
    console.log(`\nCopied ${successCount} outputs to ${OUTPUTS_DIR}/`);
  } catch {
    console.log(`\nSkipped copy to ${OUTPUTS_DIR}/ (not available)`);
  }

  // Cleanup
  await browserPool.drain();
}

main().catch((err) => {
  console.error("Visual QA failed:", err);
  browserPool.drain().then(() => process.exit(1));
});
