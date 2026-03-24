import type { ThemeDefinition } from "../../types/theme.types.js";

export const everydayTheme: ThemeDefinition = {
  id: "everyday",
  displayName: "Kotak Everyday",
  colors: {
    primary: "#E52E2E",
    secondary: "#1A3B6B",
    accent: "#FFD700",
    headingColor: "#FFFFFF",
    subheadingColor: "#F0F0F0",
    bodyColor: "#FFFFFF",
    ctaBackground: "#E52E2E",
    ctaTextColor: "#FFFFFF",
    disclaimerBackground: "rgba(0, 0, 0, 0.75)",
    disclaimerTextColor: "#CCCCCC",
  },
  typography: {
    headingFont: "Arial Black",
    bodyFont: "Arial",
    ctaFont: "Arial",
    baseFontSize: "16px",
  },
  layout: {
    defaultTextZoneWidth: "55%",
    defaultTextZoneSide: "left",
    contentPadding: "40px",
    blockGap: "16px",
    logoWidth: "120px",
    logoPosition: "top-left",
  },
  overlay: {
    type: "gradient",
    direction: "to right",
    value: "linear-gradient(to right, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 40%, rgba(255,255,255,0) 70%)",
    fallbackOpacity: 0.6,
  },
  logo: {
    src: "kotak-everyday-logo.png",
    width: "120px",
    height: "40px",
  },
  blockOverrides: {
    heading: {
      color: "#1A3B6B",
      fontFamily: "Arial Black",
      fontSize: "52px",
    },
    subheading: {
      color: "#333333",
      fontStyle: "normal",
      fontWeight: "500",
    },
    cta: {
      backgroundColor: "#E52E2E",
      color: "#FFFFFF",
      borderRadius: "6px",
    },
    "offer-line": {
      color: "#E52E2E",
      fontWeight: "bold",
    },
    disclaimer: {
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      color: "#CCCCCC",
    },
  },
};
