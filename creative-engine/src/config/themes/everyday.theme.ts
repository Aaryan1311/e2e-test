import type { ThemeDefinition } from "../../types/theme.types.js";

export const everydayTheme: ThemeDefinition = {
  id: "everyday",
  displayName: "Kotak Everyday",
  colors: {
    primary: "#FA1432",
    secondary: "#00005A",
    accent: "#DCF5FF",
    headingColor: "#FA1432",
    subheadingColor: "#00005A",
    bodyColor: "#333333",
    ctaBackground: "#FA1432",
    ctaTextColor: "#FFFFFF",
    disclaimerBackground: "rgba(0, 0, 0, 0.05)",
    disclaimerTextColor: "#666666",
  },
  typography: {
    headingFont: "Source Sans 3",
    bodyFont: "Source Sans 3",
    ctaFont: "Source Sans 3",
    baseFontSize: "16px",
  },
  layout: {
    defaultTextZoneWidth: "45%",
    defaultTextZoneSide: "left",
    contentPadding: "40px",
    blockGap: "16px",
    logoWidth: "180px",
    logoPosition: "top-left",
  },
  overlay: {
    type: "gradient",
    direction: "to right",
    value:
      "linear-gradient(to right, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.6) 50%, transparent 75%)",
    fallbackOpacity: 0.85,
  },
  logo: {
    src: "kotak-everyday.png",
    width: "180px",
  },
  blockOverrides: {
    heading: {
      fontFamily: "Source Sans 3",
      fontWeight: "700",
      color: "#FA1432",
      lineHeight: 1.0,
      textTransform: "none",
    },
    subheading: {
      fontFamily: "Source Serif 4",
      fontWeight: "500",
      fontStyle: "italic",
      color: "#00005A",
      lineHeight: 1.0,
    },
    "offer-line": {
      fontFamily: "Source Sans 3",
      fontWeight: "600",
      color: "#FA1432",
    },
    bullets: {
      fontFamily: "Source Sans 3",
      fontWeight: "400",
      color: "#333333",
    },
    "solution-line": {
      fontFamily: "Source Sans 3",
      fontWeight: "400",
      color: "#333333",
    },
    "contact-line": {
      fontFamily: "Source Sans 3",
      fontWeight: "400",
      color: "#00005A",
    },
    cta: {
      fontFamily: "Source Sans 3",
      fontWeight: "700",
      backgroundColor: "#FA1432",
      color: "#FFFFFF",
      borderRadius: "4px",
      padding: "14px 36px",
    },
    disclaimer: {
      fontFamily: "Source Sans 3",
      fontWeight: "400",
      color: "#666666",
      fontSize: "8px",
    },
    "brand-divider": {
      backgroundColor: "#FA1432",
    },
  },
  splitModeBlockOverrides: {
    heading: {
      color: "#FFFFFF",
    },
    subheading: {
      color: "#FFFFFF",
      fontFamily: "Source Serif 4",
      fontWeight: "500",
      fontStyle: "italic",
    },
    "offer-line": {
      color: "#FFFFFF",
    },
    bullets: {
      color: "rgba(255, 255, 255, 0.9)",
    },
    "solution-line": {
      color: "rgba(255, 255, 255, 0.85)",
    },
    "contact-line": {
      color: "#FFFFFF",
    },
    cta: {
      backgroundColor: "#FFFFFF",
      color: "#FA1432",
    },
    disclaimer: {
      color: "rgba(255, 255, 255, 0.7)",
      backgroundColor: "transparent",
    },
  },
};
