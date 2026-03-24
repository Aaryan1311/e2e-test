import { z } from "zod/v4";

/** Position mode determines how a block participates in layout */
export type PositionMode = "stacked" | "pinned";

/** Pinned blocks need an anchor point */
export type PinPosition =
  | "top-left"
  | "top-right"
  | "top-center"
  | "bottom-left"
  | "bottom-right"
  | "bottom-center"
  | "bottom-strip";

/** Text alignment within the block */
export type TextAlign = "left" | "center" | "right";

/**
 * Block style properties — all optional, resolved via cascade:
 * defaults → theme overrides → request overrides
 */
export interface BlockStyles {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  lineHeight?: number;
  letterSpacing?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: TextAlign;
  textTransform?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  maxWidth?: string;
  opacity?: number;
}

/** The definition of a block TYPE (registered once in config) */
export interface BlockDefinition {
  type: string;
  displayName: string;
  positionMode: PositionMode;
  pinPosition?: PinPosition;
  priority: number;
  defaultStyles: BlockStyles;
  scalable: boolean;
  minFontSize?: string;
  maxLines?: number;
  isOptional: boolean;
  htmlTag: string;
}

/** An instance of a block in a specific render request */
export interface BlockInstance {
  type: string;
  content: string;
  styleOverrides?: BlockStyles;
  items?: string[];
}

// --- Zod Schemas ---

export const TextAlignSchema = z.enum(["left", "center", "right"]);

export const PositionModeSchema = z.enum(["stacked", "pinned"]);

export const PinPositionSchema = z.enum([
  "top-left",
  "top-right",
  "top-center",
  "bottom-left",
  "bottom-right",
  "bottom-center",
  "bottom-strip",
]);

export const BlockStylesSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.string().optional(),
  fontWeight: z.string().optional(),
  fontStyle: z.string().optional(),
  lineHeight: z.number().optional(),
  letterSpacing: z.string().optional(),
  color: z.string().optional(),
  backgroundColor: z.string().optional(),
  textAlign: TextAlignSchema.optional(),
  textTransform: z.string().optional(),
  padding: z.string().optional(),
  margin: z.string().optional(),
  borderRadius: z.string().optional(),
  maxWidth: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

export const BlockDefinitionSchema = z
  .object({
    type: z.string().min(1),
    displayName: z.string().min(1),
    positionMode: PositionModeSchema,
    pinPosition: PinPositionSchema.optional(),
    priority: z.number().int().positive(),
    defaultStyles: BlockStylesSchema,
    scalable: z.boolean(),
    minFontSize: z.string().optional(),
    maxLines: z.number().int().positive().optional(),
    isOptional: z.boolean(),
    htmlTag: z.string().min(1),
  })
  .refine(
    (data) => data.positionMode !== "pinned" || data.pinPosition !== undefined,
    { message: "pinPosition is required when positionMode is 'pinned'" }
  );

export const BlockInstanceSchema = z.object({
  type: z.string().min(1),
  content: z.string(),
  styleOverrides: BlockStylesSchema.optional(),
  items: z.array(z.string()).optional(),
});
