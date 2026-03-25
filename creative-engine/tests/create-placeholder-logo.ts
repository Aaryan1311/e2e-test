import sharp from "sharp";
import path from "node:path";

/**
 * Creates a simple placeholder logo PNG with "KOTAK" text.
 */
async function createLogo(outputPath: string): Promise<void> {
  const width = 200;
  const height = 80;

  // Create a simple red rectangle with white text
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
  console.log(`[Logo] Created placeholder logo: ${outputPath}`);
}

const dest = path.resolve("jobs/test-002/input/logo.png");
createLogo(dest).catch(console.error);
