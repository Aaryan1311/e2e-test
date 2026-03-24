import type {
  BlockDefinition,
  BlockStyles,
  PositionMode,
  PinPosition,
  CanvasDefinition,
  ThemeDefinition,
  RenderRequest,
  LayoutMode,
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

/** Layout-mode-specific configuration resolved from theme + request */
export interface ResolvedLayoutConfig {
  mode: LayoutMode;

  /** For split mode */
  contentPanel?: {
    side: "left" | "right";
    x: number;
    y: number;
    width: number;
    height: number;
    backgroundColor: string;
  };
  imagePanel?: {
    side: "left" | "right";
    x: number;
    y: number;
    width: number;
    height: number;
  };
  infinityBridge?: {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    opacity: number;
    svgPath: string;
  };

  /** For image-overlay mode */
  overlay?: OverlayConfig;

  /** Common — where blocks go, regardless of mode */
  textZone: TextZone;
}

/** The complete layout result — everything needed to render */
export interface LayoutResult {
  canvas: CanvasDefinition;
  theme: ThemeDefinition;
  backgroundImage: string;
  layoutMode: LayoutMode;
  layoutConfig: ResolvedLayoutConfig;
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

/** Result of a single quality check */
export interface QualityCheck {
  name: string;
  passed: boolean;
  details: string;
  severity: "error" | "warning";
}

/** A quality warning with an actionable suggestion */
export interface QualityWarning {
  message: string;
  suggestion: string;
}

/** Aggregated result of all quality checks */
export interface QualityCheckResult {
  passed: boolean;
  checks: QualityCheck[];
  warnings: QualityWarning[];
  score: number;
}
