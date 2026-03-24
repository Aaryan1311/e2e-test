import type { ThemeDefinition } from "../../types/theme.types.js";

export const privyTheme: ThemeDefinition = {
  id: "privy",
  displayName: "Kotak Privy League",
  colors: {
    primary: "#1A3B6B",
    secondary: "#FFFFFF",
    accent: "#4A90D9",
    headingColor: "#FFFFFF",
    subheadingColor: "#D0E0F0",
    bodyColor: "#FFFFFF",
    ctaBackground: "#1A3B6B",
    ctaTextColor: "#FFFFFF",
    disclaimerBackground: "rgba(0, 0, 0, 0.7)",
    disclaimerTextColor: "#BBBBBB",
  },
  typography: {
    headingFont: "Arial",
    bodyFont: "Arial",
    ctaFont: "Arial",
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
    value: "linear-gradient(to right, rgba(26,59,107,0.92) 0%, rgba(26,59,107,0.65) 40%, rgba(26,59,107,0) 68%)",
    fallbackOpacity: 0.55,
  },
  logo: {
    src: "kotak-privy-logo.png",
    width: "130px",
    height: "42px",
  },
  blockOverrides: {
    heading: {
      color: "#FFFFFF",
      fontWeight: "bold",
      fontSize: "50px",
    },
    subheading: {
      color: "#D0E0F0",
      fontStyle: "normal",
      fontWeight: "400",
    },
    cta: {
      backgroundColor: "#4A90D9",
      color: "#FFFFFF",
      borderRadius: "6px",
    },
    "offer-line": {
      color: "#4A90D9",
      fontWeight: "bold",
    },
    disclaimer: {
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      color: "#BBBBBB",
    },
  },
};
