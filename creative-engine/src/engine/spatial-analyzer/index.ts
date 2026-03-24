import type {
  CanvasDefinition,
  ThemeDefinition,
  RenderRequest,
} from "../../types/index.js";
import type { SpatialAnalysisResult } from "../types.js";
import { detectSubject } from "./subject-detector.js";
import { calculateTextZone } from "./text-zone-calculator.js";
import { analyzeBrightness } from "./brightness-analyzer.js";

/**
 * Orchestrates the full spatial analysis pipeline:
 * 1. Detect subject position in the background image
 * 2. Calculate the optimal text zone based on subject location
 * 3. Analyze brightness in the text zone for overlay configuration
 *
 * Returns a complete SpatialAnalysisResult with text zone, overlay config,
 * and subject bounds.
 */
export async function analyzeSpatial(
  imagePath: string,
  canvas: CanvasDefinition,
  theme: ThemeDefinition,
  providedSubjectPosition?: RenderRequest["subjectPosition"]
): Promise<SpatialAnalysisResult> {
  const canvasDimensions = { width: canvas.width, height: canvas.height };

  // Step 1: Detect subject
  const { bounds: subjectBounds, confidence } = await detectSubject(
    imagePath,
    canvasDimensions,
    providedSubjectPosition
  );

  // Step 2: Calculate text zone
  const textZone = calculateTextZone(canvasDimensions, subjectBounds, theme);

  // Step 3: Analyze brightness for overlay
  const overlay = await analyzeBrightness(imagePath, textZone, theme);

  return {
    subjectBounds,
    textZone,
    overlay,
    confidence,
  };
}
