import sharp from "sharp";
import type { RenderRequest } from "../../types/index.js";
import type { BoundingBox } from "../types.js";

/**
 * Detects the subject bounding box in an image.
 *
 * Uses two strategies:
 * 1. Pre-provided position from the render request (primary, fast path).
 * 2. Heuristic detection via sharp image analysis (fallback).
 *
 * The heuristic divides the image into a 3×3 grid and scores each cell
 * by pixel variance (high variance = likely subject/detail area).
 *
 * NOTE: This heuristic can be upgraded to TensorFlow.js or an external
 * detection API for more accurate subject detection in future phases.
 */
export async function detectSubject(
  imagePath: string,
  canvasDimensions: { width: number; height: number },
  providedPosition?: RenderRequest["subjectPosition"]
): Promise<{ bounds: BoundingBox | null; confidence: number }> {
  // Strategy 1: Use pre-provided position
  if (providedPosition) {
    return {
      bounds: {
        x: Math.round(providedPosition.x),
        y: Math.round(providedPosition.y),
        width: Math.round(providedPosition.width),
        height: Math.round(providedPosition.height),
      },
      confidence: 1.0,
    };
  }

  // Strategy 2: Heuristic detection using sharp
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    const imgWidth = metadata.width ?? canvasDimensions.width;
    const imgHeight = metadata.height ?? canvasDimensions.height;

    const cellWidth = Math.floor(imgWidth / 3);
    const cellHeight = Math.floor(imgHeight / 3);

    const cellScores: { row: number; col: number; score: number }[] = [];

    // Analyze each cell in the 3×3 grid
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const left = col * cellWidth;
        const top = row * cellHeight;
        const extractWidth = Math.min(cellWidth, imgWidth - left);
        const extractHeight = Math.min(cellHeight, imgHeight - top);

        if (extractWidth <= 0 || extractHeight <= 0) continue;

        const cellBuffer = await sharp(imagePath)
          .extract({
            left,
            top,
            width: extractWidth,
            height: extractHeight,
          })
          .grayscale()
          .raw()
          .toBuffer();

        // Calculate pixel variance — high variance = likely subject/detail
        const pixels = new Uint8Array(cellBuffer);
        const n = pixels.length;
        if (n === 0) continue;

        let sum = 0;
        for (let i = 0; i < n; i++) {
          sum += pixels[i]!;
        }
        const mean = sum / n;

        let varianceSum = 0;
        for (let i = 0; i < n; i++) {
          const diff = pixels[i]! - mean;
          varianceSum += diff * diff;
        }
        const variance = varianceSum / n;

        cellScores.push({ row, col, score: variance });
      }
    }

    if (cellScores.length === 0) {
      return { bounds: null, confidence: 0 };
    }

    // Sort by score descending and pick the top cells
    cellScores.sort((a, b) => b.score - a.score);

    // Use the top-scoring cell(s) — take cells above the mean score
    const meanScore =
      cellScores.reduce((s, c) => s + c.score, 0) / cellScores.length;
    const topCells = cellScores.filter((c) => c.score > meanScore);

    if (topCells.length === 0) {
      return { bounds: null, confidence: 0 };
    }

    // Calculate bounding box covering all top cells
    let minCol = 3,
      maxCol = -1,
      minRow = 3,
      maxRow = -1;
    for (const cell of topCells) {
      minCol = Math.min(minCol, cell.col);
      maxCol = Math.max(maxCol, cell.col);
      minRow = Math.min(minRow, cell.row);
      maxRow = Math.max(maxRow, cell.row);
    }

    // Scale bounding box to canvas dimensions (image may differ from canvas)
    const scaleX = canvasDimensions.width / imgWidth;
    const scaleY = canvasDimensions.height / imgHeight;

    const bounds: BoundingBox = {
      x: Math.round(minCol * cellWidth * scaleX),
      y: Math.round(minRow * cellHeight * scaleY),
      width: Math.round((maxCol - minCol + 1) * cellWidth * scaleX),
      height: Math.round((maxRow - minRow + 1) * cellHeight * scaleY),
    };

    // Confidence based on how distinct the top cells are from the rest
    const topScore = cellScores[0]!.score;
    const bottomScore = cellScores[cellScores.length - 1]!.score;
    const confidence =
      topScore > 0
        ? Math.min(0.8, (topScore - bottomScore) / topScore)
        : 0;

    return { bounds, confidence };
  } catch (error) {
    console.warn(
      `Subject detection failed, returning null bounds: ${error instanceof Error ? error.message : String(error)}`
    );
    return { bounds: null, confidence: 0 };
  }
}
