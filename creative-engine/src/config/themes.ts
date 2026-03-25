import type { Theme, FieldStyleRule } from "../types/index.js";

/**
 * Field style rules — these define the visual hierarchy.
 * sizeWeight is relative: heading (1.0) is the largest, disclaimer (0.28) is the smallest.
 * The actual pixel sizes are calculated dynamically based on available space.
 */
export const FIELD_STYLE_RULES: Record<string, FieldStyleRule> = {
  heading: {
    sizeWeight: 1.0,
    fontKey: "heading",
    colorKey: "heading",
    maxLines: 3,
  },
  subheading: {
    sizeWeight: 0.7,
    fontKey: "subheading",
    colorKey: "subheading",
    maxLines: 3,
  },
  "offer-line": {
    sizeWeight: 0.55,
    fontKey: "heading",
    colorKey: "heading",
    maxLines: 2,
  },
  "solution-line": {
    sizeWeight: 0.5,
    fontKey: "body",
    colorKey: "body",
    maxLines: 3,
  },
  bullets: {
    sizeWeight: 0.45,
    fontKey: "body",
    colorKey: "body",
    maxLines: 8,
  },
  cta: {
    sizeWeight: 0.5,
    fontKey: "heading",
    colorKey: "heading",
    maxLines: 1,
  },
  "contact-line": {
    sizeWeight: 0.4,
    fontKey: "body",
    colorKey: "body",
    maxLines: 2,
  },
  disclaimer: {
    sizeWeight: 0.28,
    fontKey: "body",
    colorKey: "body",
    maxLines: 4,
  },
};

/** Default rule for any unrecognized field type */
export const DEFAULT_FIELD_RULE: FieldStyleRule = {
  sizeWeight: 0.5,
  fontKey: "body",
  colorKey: "body",
  maxLines: 3,
};

export const themes: Record<string, Theme> = {
  everyday: {
    id: "everyday",
    displayName: "Kotak Everyday",
    fonts: {
      heading: {
        family: "Source Sans 3",
        weight: "700",
        style: "normal",
      },
      subheading: {
        family: "Source Serif 4",
        weight: "500",
        style: "italic",
      },
      body: {
        family: "Source Sans 3",
        weight: "400",
        style: "normal",
      },
    },
    colors: {
      primary: "#FA1432",
      onPrimary: "#FFFFFF",
      heading: "#FA1432",
      subheading: "#00005A",
      body: "#333333",
      overlay: "rgba(255, 255, 255, 0.85)",
    },
  },

  solitaire: {
    id: "solitaire",
    displayName: "Kotak Solitaire",
    fonts: {
      heading: {
        family: "Source Sans 3",
        weight: "700",
        style: "normal",
      },
      subheading: {
        family: "Source Serif 4",
        weight: "500",
        style: "italic",
      },
      body: {
        family: "Source Sans 3",
        weight: "400",
        style: "normal",
      },
    },
    colors: {
      primary: "#1A1A2E",
      onPrimary: "#C9A96E",
      heading: "#1A1A2E",
      subheading: "#C9A96E",
      body: "#333333",
      overlay: "rgba(26, 26, 46, 0.8)",
    },
  },

  privy: {
    id: "privy",
    displayName: "Kotak Privy League",
    fonts: {
      heading: {
        family: "Source Sans 3",
        weight: "700",
        style: "normal",
      },
      subheading: {
        family: "Source Serif 4",
        weight: "500",
        style: "italic",
      },
      body: {
        family: "Source Sans 3",
        weight: "400",
        style: "normal",
      },
    },
    colors: {
      primary: "#00005A",
      onPrimary: "#FFFFFF",
      heading: "#00005A",
      subheading: "#FA1432",
      body: "#333333",
      overlay: "rgba(0, 0, 90, 0.75)",
    },
  },
};

export function getTheme(id: string): Theme {
  const theme = themes[id];
  if (!theme) {
    throw new Error(`Unknown theme: "${id}". Available: ${Object.keys(themes).join(", ")}`);
  }
  return theme;
}
