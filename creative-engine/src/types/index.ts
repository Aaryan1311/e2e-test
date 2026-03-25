import { z } from "zod";

/**
 * Image types determine how the text zone is detected.
 *
 * "split" — Image has a solid color panel (usually Kotak Red).
 *           The engine detects this panel area — that's the text zone.
 *
 * "full" — Full-bleed photograph with a subject.
 *          Engine detects subject position, places text on the opposite side.
 *          Engine adds a gradient overlay on the text zone for readability.
 *
 * "portrait" — Subject is prominent in the lower/center area.
 *              Text goes ABOVE the subject in the upper portion of the image.
 *              Engine adds a gradient overlay on the text zone for readability.
 */
export type ImageType = "split" | "full" | "portrait";

/**
 * A text field to render on the image.
 * Type determines styling (font family, weight, relative size).
 * Content is the actual text to display.
 */
export interface TextField {
  type: string;
  content: string;
  items?: string[];
}

/**
 * The complete input to the engine.
 */
export interface RenderRequest {
  image: string;
  imageType: ImageType;
  theme: string;
  fields: TextField[];
}

/**
 * What the engine returns.
 */
export interface RenderResult {
  imageBuffer: Buffer;
  width: number;
  height: number;
  textZone: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fieldSizes: Array<{
    type: string;
    fontSize: number;
    lineHeight: number;
    y: number;
  }>;
}

/**
 * Bounding box for spatial regions.
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Theme defines font families, colors, and styling rules per field type.
 */
export interface Theme {
  id: string;
  displayName: string;
  fonts: {
    heading: FontConfig;
    subheading: FontConfig;
    body: FontConfig;
  };
  colors: {
    primary: string;
    onPrimary: string;
    heading: string;
    subheading: string;
    body: string;
    overlay: string;
  };
}

export interface FontConfig {
  family: string;
  weight: string;
  style: string;
}

/**
 * Field style hierarchy — maps field types to relative sizing weights.
 */
export interface FieldStyleRule {
  sizeWeight: number;
  fontKey: "heading" | "subheading" | "body";
  colorKey: string;
  textTransform?: string;
  maxLines?: number;
}

// Zod schemas
export const TextFieldSchema = z.object({
  type: z.string(),
  content: z.string(),
  items: z.array(z.string()).optional(),
});

export const RenderRequestSchema = z.object({
  image: z.string().min(1, "image path is required"),
  imageType: z.enum(["split", "full", "portrait"]),
  theme: z.string().default("everyday"),
  fields: z.array(TextFieldSchema).min(1, "at least one field is required"),
});
