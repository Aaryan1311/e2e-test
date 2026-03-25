import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { render } from "../src/engine/pipeline.js";
import { browserPool } from "../src/engine/browser-pool.js";
import type { RenderRequest } from "../src/types/index.js";

const TEST_IMAGE = "./test-assets/test-image-travel.png";
const OUTPUT_DIR = "./test-output";

interface TestCase {
  name: string;
  request: RenderRequest;
}

const testCases: TestCase[] = [
  {
    name: "01-split-2fields",
    request: {
      image: TEST_IMAGE,
      imageType: "split",
      theme: "everyday",
      fields: [
        { type: "heading", content: "Your journey to financial freedom" },
        { type: "subheading", content: "starts with the right savings plan" },
      ],
    },
  },
  {
    name: "02-full-2fields",
    request: {
      image: TEST_IMAGE,
      imageType: "full",
      theme: "everyday",
      fields: [
        { type: "heading", content: "Adventure Awaits" },
        { type: "subheading", content: "and so does smart banking" },
      ],
    },
  },
  {
    name: "03-full-5fields-stress",
    request: {
      image: TEST_IMAGE,
      imageType: "full",
      theme: "everyday",
      fields: [
        { type: "heading", content: "Travel Savings Account" },
        { type: "subheading", content: "for the explorer in you" },
        { type: "offer-line", content: "Zero forex markup on international spends" },
        { type: "solution-line", content: "Load multiple currencies. Spend anywhere. Track everything." },
        { type: "cta", content: "Open Account Now" },
      ],
    },
  },
  {
    name: "04-full-1field-large",
    request: {
      image: TEST_IMAGE,
      imageType: "full",
      theme: "everyday",
      fields: [
        { type: "heading", content: "Explore the World" },
      ],
    },
  },
  {
    name: "05-portrait-3fields",
    request: {
      image: TEST_IMAGE,
      imageType: "portrait",
      theme: "everyday",
      fields: [
        { type: "heading", content: "Your dream home" },
        { type: "subheading", content: "becoming reality" },
        { type: "cta", content: "Apply Now" },
      ],
    },
  },
  {
    name: "06-full-bullets",
    request: {
      image: TEST_IMAGE,
      imageType: "full",
      theme: "everyday",
      fields: [
        { type: "heading", content: "Travel Card Benefits" },
        {
          type: "bullets",
          content: "",
          items: [
            "Zero forex markup",
            "Complimentary travel insurance",
            "Airport lounge access",
            "24/7 helpline",
          ],
        },
        { type: "cta", content: "Get Your Card" },
      ],
    },
  },
  {
    name: "07-full-7fields-max",
    request: {
      image: TEST_IMAGE,
      imageType: "full",
      theme: "everyday",
      fields: [
        { type: "heading", content: "Explore the World" },
        { type: "subheading", content: "with Kotak Travel Card" },
        { type: "offer-line", content: "Limited offer: Zero annual fee" },
        { type: "solution-line", content: "Load currencies, spend anywhere, track everything" },
        { type: "bullets", content: "", items: ["Zero forex", "Insurance", "Lounge access"] },
        { type: "contact-line", content: "Call 1800 266 2666" },
        { type: "disclaimer", content: "T&C Apply. Kotak Mahindra Bank Ltd." },
      ],
    },
  },
  {
    name: "08-solitaire-theme",
    request: {
      image: TEST_IMAGE,
      imageType: "full",
      theme: "solitaire",
      fields: [
        { type: "heading", content: "Exclusive Privileges" },
        { type: "subheading", content: "for the discerning few" },
      ],
    },
  },
];

async function runTests() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log("=".repeat(60));
  console.log("  VISUAL QA — Creative Engine Phase 7");
  console.log("=".repeat(60));
  console.log();

  let passed = 0;

  for (const tc of testCases) {
    const label = `[${tc.name}]`;
    try {
      console.log(`${label} Running...`);
      const startTime = Date.now();

      const result = await render(tc.request);
      const duration = Date.now() - startTime;

      const outputPath = resolve(OUTPUT_DIR, `${tc.name}.png`);
      await writeFile(outputPath, result.imageBuffer);

      console.log(`${label} OK (${duration}ms)`);
      console.log(`  Dimensions: ${result.width}x${result.height}`);
      console.log(
        `  Text zone: ${result.textZone.width}x${result.textZone.height} at (${result.textZone.x}, ${result.textZone.y})`,
      );
      console.log(
        `  Fields: ${result.fieldSizes.map((f) => `${f.type}@${f.fontSize}px`).join(", ")}`,
      );
      console.log(`  Output: ${outputPath}`);
      console.log();
      passed++;
    } catch (err) {
      console.error(`${label} FAILED:`, err);
      console.log();
    }
  }

  console.log("=".repeat(60));
  console.log(`  Results: ${passed}/${testCases.length} passed`);
  console.log("=".repeat(60));

  // Copy to /mnt/user-data/outputs/
  try {
    const mntDir = "/mnt/user-data/outputs";
    await mkdir(mntDir, { recursive: true });
    for (const tc of testCases) {
      const src = resolve(OUTPUT_DIR, `${tc.name}.png`);
      const dst = resolve(mntDir, `${tc.name}.png`);
      try {
        const buf = await (await import("node:fs/promises")).readFile(src);
        await writeFile(dst, buf);
      } catch {
        // Skip if source doesn't exist
      }
    }
    console.log(`\nOutputs copied to ${mntDir}/`);
  } catch (err) {
    console.warn("Could not copy to /mnt/user-data/outputs/:", err);
  }

  // Clean up browser pool
  await browserPool.drain();
}

runTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
