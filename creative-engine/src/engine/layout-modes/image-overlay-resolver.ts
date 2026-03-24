import type {
  CanvasDefinition,
  ThemeDefinition,
  RenderRequest,
} from "../../types/index.js";
import type { ResolvedLayoutConfig } from "../types.js";
import { analyzeSpatial } from "../spatial-analyzer/index.js";

/**
 * Resolves layout configuration for image-overlay mode.
 *
 * This runs the full spatial analysis pipeline:
 * subject detection → text zone calculation → brightness analysis.
 * The result is wrapped in a ResolvedLayoutConfig.
 */
export async function resolveImageOverlayLayout(
  imagePath: string,
  canvas: CanvasDefinition,
  theme: ThemeDefinition,
  providedSubjectPosition?: RenderRequest["subjectPosition"]
): Promise<ResolvedLayoutConfig> {
  const spatialResult = await analyzeSpatial(
    imagePath,
    canvas,
    theme,
    providedSubjectPosition
  );

  return {
    mode: "image-overlay",
    overlay: spatialResult.overlay,
    textZone: spatialResult.textZone,
  };
}
