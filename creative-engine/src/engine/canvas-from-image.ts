import sharp from "sharp";
import type { CanvasDefinition } from "../types/index.js";

/**
 * Reads image dimensions and creates a CanvasDefinition from them.
 * The image IS the canvas — no predefined sizes needed.
 */
export async function canvasFromImage(imagePath: string): Promise<CanvasDefinition> {
  const metadata = await sharp(imagePath).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Cannot read dimensions from image: ${imagePath}`);
  }

  const width = metadata.width;
  const height = metadata.height;

  const gcd = greatestCommonDivisor(width, height);
  const ratioW = width / gcd;
  const ratioH = height / gcd;

  return {
    id: `dynamic_${width}x${height}`,
    name: `${width}×${height}`,
    aspectRatio: `${ratioW}:${ratioH}`,
    width,
    height,
  };
}

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}
