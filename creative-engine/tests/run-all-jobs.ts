import { runJob } from "../src/runner.js";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { browserPool } from "../src/engine/browser-pool.js";

const JOBS = ["test-001", "test-002", "test-003", "test-004", "test-005"];

async function createPlaceholderLogo(outputPath: string): Promise<void> {
  const width = 200;
  const height = 80;
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" rx="8" fill="#FA1432"/>
      <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
            font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white">
        KOTAK
      </text>
    </svg>
  `;
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

async function main() {
  let passed = 0;
  let failed = 0;

  for (const jobName of JOBS) {
    const jobDir = path.join("jobs", jobName);
    const inputDir = path.join(jobDir, "input");

    // Ensure input dir exists
    await fs.mkdir(inputDir, { recursive: true });

    // Create placeholder logo for test-002 if needed
    if (jobName === "test-002") {
      const logoDest = path.join(inputDir, "logo.png");
      try {
        await fs.access(logoDest);
      } catch {
        await createPlaceholderLogo(logoDest);
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`  JOB: ${jobName}`);
    console.log(`${"=".repeat(60)}`);

    try {
      await runJob(jobDir);

      // Verify output exists
      const resultPath = path.join(jobDir, "output", "result.png");
      const debugPath = path.join(jobDir, "output", "debug.html");
      const resultStat = await fs.stat(resultPath);
      const debugStat = await fs.stat(debugPath);

      console.log(`  result.png: ${(resultStat.size / 1024).toFixed(0)}KB`);
      console.log(`  debug.html: ${(debugStat.size / 1024).toFixed(0)}KB`);
      console.log(`  ✓ ${jobName} — SUCCESS`);
      passed++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ ${jobName} — FAILED: ${message}`);
      failed++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed out of ${JOBS.length}`);
  console.log(`  Check jobs/*/output/result.png for visual outputs`);
  console.log(`${"=".repeat(60)}`);

  // Cleanup
  await browserPool.drain();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
