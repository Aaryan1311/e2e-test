import { z } from "zod/v4";
import { BlockStylesSchema, PinPositionSchema } from "./block.types.js";
import type { BlockStyles, PinPosition } from "./block.types.js";

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent?: string;
  headingColor: string;
  subheadingColor: string;
  bodyColor: string;
  ctaBackground: string;
  ctaTextColor: string;
  disclaimerBackground?: string;
  disclaimerTextColor?: string;
}

export interface ThemeTypography {
  headingFont: string;
  bodyFont: string;
  ctaFont?: string;
  baseFontSize: string;
}

export interface ThemeLayout {
  defaultTextZoneWidth: string;
  defaultTextZoneSide: "left" | "right";
  contentPadding: string;
  blockGap: string;
  logoWidth: string;
  logoPosition: PinPosition;
}

export interface ThemeOverlay {
  type: "gradient" | "solid" | "none";
  direction?: string;
  value: string;
  fallbackOpacity: number;
}

/** Theme-specific style overrides for block types */
export type ThemeBlockOverrides = Record<string, Partial<BlockStyles>>;

export interface ThemeDefinition {
  id: string;
  displayName: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
  overlay: ThemeOverlay;
  logo: {
    src: string;
    width: string;
    height?: string;
  };
  blockOverrides: ThemeBlockOverrides;
}

// --- Zod Schemas ---

export const ThemeColorsSchema = z.object({
  primary: z.string().min(1),
  secondary: z.string().min(1),
  accent: z.string().optional(),
  headingColor: z.string().min(1),
  subheadingColor: z.string().min(1),
  bodyColor: z.string().min(1),
  ctaBackground: z.string().min(1),
  ctaTextColor: z.string().min(1),
  disclaimerBackground: z.string().optional(),
  disclaimerTextColor: z.string().optional(),
});

export const ThemeTypographySchema = z.object({
  headingFont: z.string().min(1),
  bodyFont: z.string().min(1),
  ctaFont: z.string().optional(),
  baseFontSize: z.string().min(1),
});

export const ThemeLayoutSchema = z.object({
  defaultTextZoneWidth: z.string().min(1),
  defaultTextZoneSide: z.enum(["left", "right"]),
  contentPadding: z.string().min(1),
  blockGap: z.string().min(1),
  logoWidth: z.string().min(1),
  logoPosition: PinPositionSchema,
});

export const ThemeOverlaySchema = z.object({
  type: z.enum(["gradient", "solid", "none"]),
  direction: z.string().optional(),
  value: z.string(),
  fallbackOpacity: z.number().min(0).max(1),
});

export const ThemeDefinitionSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  colors: ThemeColorsSchema,
  typography: ThemeTypographySchema,
  layout: ThemeLayoutSchema,
  overlay: ThemeOverlaySchema,
  logo: z.object({
    src: z.string().min(1),
    width: z.string().min(1),
    height: z.string().optional(),
  }),
  blockOverrides: z.record(z.string(), BlockStylesSchema.partial()),
});
