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

// --- Phase 8: Job-based types ---

/**
 * Complete job configuration — read from config.json in the job's input/ folder.
 */
export interface JobConfig {
  imageType: ImageType;
  account: string;
  header?: HeaderConfig;
  gradient?: GradientConfig;
  fields: FieldConfig[];
}

export interface HeaderConfig {
  logo?: string;
  logoWidth?: number;
  logoHeight?: number;
  productName?: string;
  productNameFontSize?: number;
  productNameFontWeight?: string;
  productNameFontFamily?: string;
  productNameColor?: string;
  gap?: number;
  padding?: {
    top?: number;
    left?: number;
    bottom?: number;
  };
}

export interface GradientConfig {
  color?: string;
  width?: number;
  direction?: string;
  enabled?: boolean;
}

export interface FieldConfig {
  type: string;
  content: string;
  items?: string[];
  fontSize?: number | null;
  fontWeight?: string | null;
  fontFamily?: string | null;
  fontStyle?: string | null;
  color?: string | null;
  lineHeight?: number | null;
  letterSpacing?: string | null;
  textTransform?: string | null;
  textAlign?: string | null;
  maxLines?: number | null;
  opacity?: number | null;
  marginBottom?: number | null;
}

export interface ResolvedHeader {
  logoBase64: string | null;
  logoWidth: number;
  logoHeight: number;
  productName: string | null;
  productNameFontSize: number;
  productNameFontWeight: string;
  productNameFontFamily: string;
  productNameColor: string;
  gap: number;
  paddingTop: number;
  paddingLeft: number;
  paddingBottom: number;
  contentHeight: number;
  totalHeight: number;
}

export interface FieldOverrides {
  fontWeight: string | null;
  fontFamily: string | null;
  fontStyle: string | null;
  color: string | null;
  letterSpacing: string | null;
  textTransform: string | null;
  textAlign: string | null;
  opacity: number | null;
}

/**
 * What the engine returns.
 */
export interface RenderResult {
  imageBuffer: Buffer;
  html: string;
  width: number;
  height: number;
}

// Zod schemas
export const FieldConfigSchema = z.object({
  type: z.string(),
  content: z.string(),
  items: z.array(z.string()).optional(),
  fontSize: z.number().nullable().optional(),
  fontWeight: z.string().nullable().optional(),
  fontFamily: z.string().nullable().optional(),
  fontStyle: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  lineHeight: z.number().nullable().optional(),
  letterSpacing: z.string().nullable().optional(),
  textTransform: z.string().nullable().optional(),
  textAlign: z.string().nullable().optional(),
  maxLines: z.number().nullable().optional(),
  opacity: z.number().nullable().optional(),
  marginBottom: z.number().nullable().optional(),
});

export const HeaderConfigSchema = z.object({
  logo: z.string().optional(),
  logoWidth: z.number().optional(),
  logoHeight: z.number().optional(),
  productName: z.string().optional(),
  productNameFontSize: z.number().optional(),
  productNameFontWeight: z.string().optional(),
  productNameFontFamily: z.string().optional(),
  productNameColor: z.string().optional(),
  gap: z.number().optional(),
  padding: z.object({
    top: z.number().optional(),
    left: z.number().optional(),
    bottom: z.number().optional(),
  }).optional(),
});

export const GradientConfigSchema = z.object({
  color: z.string().optional(),
  width: z.number().optional(),
  direction: z.string().optional(),
  enabled: z.boolean().optional(),
});

export const JobConfigSchema = z.object({
  imageType: z.enum(["split", "full", "portrait"]),
  account: z.string(),
  header: HeaderConfigSchema.optional(),
  gradient: GradientConfigSchema.optional(),
  fields: z.array(FieldConfigSchema).min(1, "at least one field is required"),
});
