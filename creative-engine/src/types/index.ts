import { z } from "zod";

/**
 * Composition describes where the subject is in the image,
 * which determines where text is placed.
 *
 * "bottomRight" — Subject is in the bottom-right area.
 *                  Text zone: top-left portion of the image.
 *                  Gradient: fades from left toward the subject.
 *
 * "bottomCenter" — Subject is centered in the lower portion.
 *                   Text zone: top portion of the image, full width.
 *                   Gradient: fades from top downward toward the subject.
 *
 * "halfAndHalf" — Image is pre-split (e.g., red panel on left, photo on right).
 *                  Text zone: the solid-color panel area.
 *                  NO gradient needed — text sits on the solid panel.
 */
export type Composition = "bottomRight" | "bottomCenter" | "halfAndHalf";

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
  image?: string;
  composition: Composition;
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
  image: z.string().optional(),
  composition: z.enum(["bottomRight", "bottomCenter", "halfAndHalf"]),
  account: z.string(),
  header: HeaderConfigSchema.optional(),
  gradient: GradientConfigSchema.optional(),
  fields: z.array(FieldConfigSchema).min(1, "at least one field is required"),
});
