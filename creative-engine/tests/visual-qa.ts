/**
 * Visual QA Script
 *
 * Generates multiple creatives using a real production image across
 * different layout modes, block combinations, and aspect ratios.
 *
 * Output goes to test-output/visual-qa/ for human inspection.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import type { RenderRequest } from "../src/types/index.js";
import { generateCreatives } from "../src/engine/pipeline.js";
import { browserPool } from "../src/engine/renderer/browser-pool.js";

const IMAGE_PATH = "./test-assets/test-image-travel.png";
const OUTPUT_BASE = resolve(process.cwd(), "test-output", "visual-qa");

interface TestCase {
  id: string;
  name: string;
  subdir: string;
  request: RenderRequest;
}

// ============================================================
// Test Definitions
// ============================================================

const testCases: TestCase[] = [
  // --- Test Set 1: Split Mode — Everyday Theme ---
  {
    id: "1a",
    name: "Split: Heading + Subheading (minimal)",
    subdir: "split",
    request: {
      accountType: "everyday",
      layoutMode: "split",
      aspectRatios: ["1:1", "16:9", "9:16"],
      backgroundImage: IMAGE_PATH,
      blocks: [
        { type: "heading", content: "Your journey to financial freedom" },
        { type: "subheading", content: "starts with the right savings plan" },
      ],
    },
  },
  {
    id: "1b",
    name: "Split: Content-heavy (bullets + CTA + disclaimer)",
    subdir: "split",
    request: {
      accountType: "everyday",
      layoutMode: "split",
      aspectRatios: ["1:1", "16:9", "9:16"],
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
  {
    id: "1c",
    name: "Split: Maximum blocks",
    subdir: "split",
    request: {
      accountType: "everyday",
      layoutMode: "split",
      aspectRatios: ["1:1", "16:9", "9:16"],
      backgroundImage: IMAGE_PATH,
      blocks: [
        { type: "heading", content: "Explore the World" },
        { type: "subheading", content: "with Kotak Travel Card" },
        {
          type: "offer-line",
          content: "Limited offer: Zero annual fee for first year",
        },
        {
          type: "solution-line",
          content:
            "Load multiple currencies. Spend anywhere. Track everything from your phone.",
        },
        { type: "cta", content: "Apply Now" },
        {
          type: "contact-line",
          content: "Call 1800 266 2666 | Visit www.kotak.com",
        },
        {
          type: "disclaimer",
          content:
            "Kotak Mahindra Bank Ltd. | CIN: L65110MH1985PLC038137. Registered Office: 27 BKC, C27, G Block, Bandra Kurla Complex, Bandra (E), Mumbai - 400 051. www.kotak.com | T&C Apply",
        },
      ],
    },
  },
  {
    id: "1d",
    name: "Split: Content panel on RIGHT",
    subdir: "split",
    request: {
      accountType: "everyday",
      layoutMode: "split",
      splitConfig: { contentPanelSide: "right", contentPanelRatio: 0.5 },
      aspectRatios: ["1:1", "16:9"],
      backgroundImage: IMAGE_PATH,
      blocks: [
        { type: "heading", content: "Save More Travel More" },
        { type: "subheading", content: "with Kotak Everyday Account" },
        { type: "cta", content: "Get Started" },
      ],
    },
  },

  // --- Test Set 2: Image-Overlay Mode ---
  {
    id: "2a",
    name: "Overlay: With subject position",
    subdir: "overlay",
    request: {
      accountType: "everyday",
      layoutMode: "image-overlay",
      aspectRatios: ["1:1", "16:9", "9:16"],
      backgroundImage: IMAGE_PATH,
      subjectPosition: { x: 850, y: 100, width: 400, height: 600 },
      blocks: [
        { type: "heading", content: "Your journey to financial freedom" },
        { type: "subheading", content: "starts with the right savings plan" },
        { type: "cta", content: "Open Account" },
      ],
    },
  },
  {
    id: "2b",
    name: "Overlay: Heuristic subject detection",
    subdir: "overlay",
    request: {
      accountType: "everyday",
      layoutMode: "image-overlay",
      aspectRatios: ["1:1", "16:9"],
      backgroundImage: IMAGE_PATH,
      blocks: [
        { type: "heading", content: "Adventure Awaits" },
        { type: "subheading", content: "and so does smart banking" },
        { type: "cta", content: "Learn More" },
      ],
    },
  },

  // --- Test Set 3: Image-Forward Mode ---
  {
    id: "3a",
    name: "Forward: Logo + disclaimer only",
    subdir: "forward",
    request: {
      accountType: "everyday",
      layoutMode: "image-forward",
      aspectRatios: ["1:1", "4:5"],
      backgroundImage: IMAGE_PATH,
      blocks: [
        {
          type: "disclaimer",
          content: "Kotak Mahindra Bank Ltd. | T&C Apply",
        },
      ],
    },
  },

  // --- Test Set 4: Cross-Theme Comparison ---
  {
    id: "everyday",
    name: "Theme: Everyday",
    subdir: "themes",
    request: {
      accountType: "everyday",
      layoutMode: "split",
      aspectRatios: ["1:1"],
      backgroundImage: IMAGE_PATH,
      blocks: [
        { type: "heading", content: "Your journey to financial freedom" },
        { type: "subheading", content: "starts with the right savings plan" },
      ],
    },
  },
  {
    id: "solitaire",
    name: "Theme: Solitaire",
    subdir: "themes",
    request: {
      accountType: "solitaire",
      layoutMode: "split",
      aspectRatios: ["1:1"],
      backgroundImage: IMAGE_PATH,
      blocks: [
        { type: "heading", content: "Your journey to financial freedom" },
        { type: "subheading", content: "starts with the right savings plan" },
      ],
    },
  },
  {
    id: "privy",
    name: "Theme: Privy League",
    subdir: "themes",
    request: {
      accountType: "privy",
      layoutMode: "split",
      aspectRatios: ["1:1"],
      backgroundImage: IMAGE_PATH,
      blocks: [
        { type: "heading", content: "Your journey to financial freedom" },
        { type: "subheading", content: "starts with the right savings plan" },
      ],
    },
  },

  // --- Test Set 5: All 9 Aspect Ratios ---
  {
    id: "all-ratios",
    name: "All 9 ratios: Content-heavy split",
    subdir: "ratios",
    request: {
      accountType: "everyday",
      layoutMode: "split",
      aspectRatios: [
        "1:1",
        "9:16",
        "16:9",
        "4:5",
        "3:4",
        "2:1",
        "1:2",
        "728:90",
        "3:1",
      ],
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
];

// ============================================================
// Runner
// ============================================================

interface RenderSummary {
  testId: string;
  testName: string;
  aspectRatio: string;
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

  const summaries: RenderSummary[] = [];
  let totalRenders = 0;
  let successCount = 0;
  let failCount = 0;

  for (const test of testCases) {
    const outputDir = resolve(OUTPUT_BASE, test.subdir);
    await mkdir(outputDir, { recursive: true });

    console.log(`\n${"═".repeat(60)}`);
    console.log(`Test ${test.id}: ${test.name}`);
    console.log(`Mode: ${test.request.layoutMode ?? "split"}`);
    console.log(`Aspect ratios: ${test.request.aspectRatios.join(", ")}`);
    console.log(`${"═".repeat(60)}`);

    const start = performance.now();

    try {
      const results = await generateCreatives(test.request);
      const elapsed = Math.round(performance.now() - start);

      for (const result of results) {
        totalRenders++;
        const ratioSlug = result.aspectRatio.replace(":", "x");
        const filename = `${test.id}-${ratioSlug}.png`;
        const filePath = resolve(outputDir, filename);

        await writeFile(filePath, result.imageBuffer);
        const fileSizeKb = Math.round(result.imageBuffer.length / 1024);

        const qualityChecks = result.metadata.qualityChecks ?? {};
        const failedChecks = Object.entries(qualityChecks)
          .filter(([, passed]) => !passed)
          .map(([name]) => name);

        // Estimate score from checks
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
          (c) => `${test.id}/${result.aspectRatio}: quality check "${c}" failed`
        );

        console.log(
          `  ✓ ${ratioSlug}: ${result.width}x${result.height} | ` +
            `quality=${score} | ${fileSizeKb}KB | ${filename}`
        );
        if (warnings.length > 0) {
          for (const w of warnings)
            console.log(`    ⚠ ${w}`);
        }

        summaries.push({
          testId: test.id,
          testName: test.name,
          aspectRatio: result.aspectRatio,
          qualityScore: score,
          warnings,
          filePath,
          fileSize: result.imageBuffer.length,
          renderTimeMs: elapsed,
          success: true,
        });

        successCount++;
      }

      // Check for missing ratios
      const renderedRatios = new Set(results.map((r) => r.aspectRatio));
      for (const ratio of test.request.aspectRatios) {
        if (!renderedRatios.has(ratio)) {
          totalRenders++;
          failCount++;
          console.log(`  ✗ ${ratio}: FAILED (no output)`);
          summaries.push({
            testId: test.id,
            testName: test.name,
            aspectRatio: ratio,
            qualityScore: 0,
            warnings: [],
            filePath: "",
            fileSize: 0,
            renderTimeMs: 0,
            success: false,
            error: "No output produced",
          });
        }
      }
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      const errorMsg =
        err instanceof Error ? err.message : String(err);
      console.error(`  ✗ FAILED (${elapsed}ms): ${errorMsg}`);

      for (const ratio of test.request.aspectRatios) {
        totalRenders++;
        failCount++;
        summaries.push({
          testId: test.id,
          testName: test.name,
          aspectRatio: ratio,
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
  console.log(`Total renders: ${totalRenders}`);
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

  // Cleanup
  await browserPool.drain();
}

main().catch((err) => {
  console.error("Visual QA failed:", err);
  browserPool.drain().then(() => process.exit(1));
});
