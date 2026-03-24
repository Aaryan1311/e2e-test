import type { ThemeDefinition } from "../../types/theme.types.js";

export const privyTheme: ThemeDefinition = {
  id: "privy",
  displayName: "Kotak Privy League",
  colors: {
    primary: "#00005A",
    secondary: "#FA1432",
    accent: "#4A90D9",
    headingColor: "#00005A",
    subheadingColor: "#FA1432",
    bodyColor: "#FFFFFF",
    ctaBackground: "#00005A",
    ctaTextColor: "#FFFFFF",
    disclaimerBackground: "rgba(0, 0, 0, 0.7)",
    disclaimerTextColor: "#BBBBBB",
  },
  typography: {
    headingFont: "Source Sans 3",
    bodyFont: "Source Sans 3",
    ctaFont: "Source Sans 3",
    baseFontSize: "16px",
  },
  layout: {
    defaultTextZoneWidth: "55%",
    defaultTextZoneSide: "left",
    contentPadding: "44px",
    blockGap: "18px",
    logoWidth: "130px",
    logoPosition: "top-left",
  },
  overlay: {
    type: "gradient",
    direction: "to right",
    value:
      "linear-gradient(to right, rgba(0,0,90,0.92) 0%, rgba(0,0,90,0.65) 40%, rgba(0,0,90,0) 68%)",
    fallbackOpacity: 0.55,
  },
  logo: {
    src: "kotak-privy-logo.png",
    width: "130px",
    height: "42px",
  },
  blockOverrides: {
    heading: {
      fontFamily: "Source Sans 3",
      fontWeight: "700",
      color: "#00005A",
      fontSize: "50px",
      lineHeight: 1.05,
    },
    subheading: {
      fontFamily: "Source Serif 4",
      fontWeight: "500",
      fontStyle: "italic",
      color: "#FA1432",
      lineHeight: 1.05,
    },
    "offer-line": {
      fontFamily: "Source Sans 3",
      fontWeight: "600",
      color: "#00005A",
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
      backgroundColor: "#4A90D9",
      color: "#FFFFFF",
      borderRadius: "6px",
    },
    "brand-divider": {
      backgroundColor: "#00005A",
    },
    disclaimer: {
      fontFamily: "Source Sans 3",
      fontWeight: "400",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      color: "#BBBBBB",
    },
  },
  splitModeBlockOverrides: {
    heading: {
      color: "#FFFFFF",
    },
    subheading: {
      color: "#DCF5FF",
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
      color: "#00005A",
    },
    disclaimer: {
      color: "rgba(255, 255, 255, 0.7)",
      backgroundColor: "transparent",
    },
  },
};
