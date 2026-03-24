import type {
  BlockDefinition,
  BlockStyles,
  PositionMode,
  PinPosition,
  CanvasDefinition,
  ThemeDefinition,
  RenderRequest,
} from "../types/index.js";

/** Axis-aligned bounding box in pixel coordinates */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The region of the canvas available for stacked text blocks */
export interface TextZone {
  x: number;
  y: number;
  width: number;
  height: number;
  side: "left" | "right" | "center";
}

/** Resolved overlay configuration ready for rendering */
export interface OverlayConfig {
  type: "gradient" | "solid" | "none";
  direction?: string;
  css: string;
  opacity: number;
}

/** Output of spatial analysis */
export interface SpatialAnalysisResult {
  subjectBounds: BoundingBox | null;
  textZone: TextZone;
  overlay: OverlayConfig;
  confidence: number;
}

/** A block with all its styles fully resolved (no optional properties) */
export interface ResolvedBlock {
  type: string;
  content: string;
  items?: string[];
  definition: BlockDefinition;
  resolvedStyles: Required<BlockStyles>;
  positionMode: PositionMode;
  pinPosition?: PinPosition;
  priority: number;
}

/** A block with its final position calculated */
export interface PositionedBlock extends ResolvedBlock {
  bounds: BoundingBox;
  scaledFontSize?: string;
}

/** The complete layout result — everything needed to render */
export interface LayoutResult {
  canvas: CanvasDefinition;
  theme: ThemeDefinition;
  backgroundImage: string;
  textZone: TextZone;
  overlay: OverlayConfig;
  stackedBlocks: PositionedBlock[];
  pinnedBlocks: PositionedBlock[];
  metadata: {
    totalStackedHeight: number;
    availableStackedHeight: number;
    wasScaled: boolean;
    unusedSpace: number;
  };
}
