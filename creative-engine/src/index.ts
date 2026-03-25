import { runJob } from "./runner.js";

const jobDir = process.argv[2];

if (!jobDir) {
  console.error("Usage: pnpm tsx src/index.ts <job-directory>");
  console.error("Example: pnpm tsx src/index.ts jobs/job-001");
  process.exit(1);
}

runJob(jobDir)
  .then(() => {
    console.log("[Done]");
    process.exit(0);
  })
  .catch((err: Error) => {
    console.error("[Fatal]", err.message);
    process.exit(1);
  });
