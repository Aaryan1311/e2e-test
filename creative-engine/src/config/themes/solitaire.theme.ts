import type { ThemeDefinition } from "../../types/theme.types.js";

export const solitaireTheme: ThemeDefinition = {
  id: "solitaire",
  displayName: "Kotak Solitaire",
  colors: {
    primary: "#1A1A2E",
    secondary: "#C9A96E",
    accent: "#E8D5A3",
    headingColor: "#C9A96E",
    subheadingColor: "#1A1A2E",
    bodyColor: "#F0EDE4",
    ctaBackground: "#C9A96E",
    ctaTextColor: "#1A1A2E",
    disclaimerBackground: "rgba(13, 27, 62, 0.85)",
    disclaimerTextColor: "#A0A0A0",
  },
  typography: {
    headingFont: "Source Sans 3",
    bodyFont: "Source Sans 3",
    ctaFont: "Source Sans 3",
    baseFontSize: "16px",
  },
  layout: {
    defaultTextZoneWidth: "50%",
    defaultTextZoneSide: "left",
    contentPadding: "48px",
    blockGap: "20px",
    logoWidth: "140px",
    logoPosition: "top-left",
  },
  overlay: {
    type: "gradient",
    direction: "to right",
    value:
      "linear-gradient(to right, rgba(26,26,46,0.92) 0%, rgba(26,26,46,0.6) 45%, rgba(26,26,46,0) 70%)",
    fallbackOpacity: 0.5,
  },
  logo: {
    src: "kotak-solitaire-logo.png",
    width: "140px",
    height: "45px",
  },
  blockOverrides: {
    heading: {
      fontFamily: "Source Sans 3",
      fontWeight: "700",
      color: "#C9A96E",
      fontSize: "46px",
      letterSpacing: "1px",
      lineHeight: 1.05,
    },
    subheading: {
      fontFamily: "Source Serif 4",
      fontWeight: "500",
      fontStyle: "italic",
      color: "#E8D5A3",
      lineHeight: 1.05,
    },
    "offer-line": {
      fontFamily: "Source Sans 3",
      fontWeight: "600",
      color: "#C9A96E",
    },
    bullets: {
      fontFamily: "Source Sans 3",
      fontWeight: "400",
      color: "#F0EDE4",
    },
    "solution-line": {
      fontFamily: "Source Sans 3",
      fontWeight: "400",
      color: "#F0EDE4",
    },
    "contact-line": {
      fontFamily: "Source Sans 3",
      fontWeight: "400",
      color: "#E8D5A3",
    },
    cta: {
      fontFamily: "Source Sans 3",
      fontWeight: "700",
      backgroundColor: "#C9A96E",
      color: "#1A1A2E",
      borderRadius: "4px",
      textTransform: "uppercase",
      letterSpacing: "2px",
    },
    "brand-divider": {
      backgroundColor: "#C9A96E",
      opacity: 0.6,
    },
    disclaimer: {
      fontFamily: "Source Sans 3",
      fontWeight: "400",
      backgroundColor: "rgba(13, 27, 62, 0.85)",
      color: "#A0A0A0",
    },
  },
  splitModeBlockOverrides: {
    heading: {
      color: "#C9A96E",
    },
    subheading: {
      color: "#FFFFFF",
      fontFamily: "Source Serif 4",
      fontWeight: "500",
      fontStyle: "italic",
    },
    "offer-line": {
      color: "#C9A96E",
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
      backgroundColor: "#C9A96E",
      color: "#1A1A2E",
    },
    disclaimer: {
      color: "rgba(255, 255, 255, 0.6)",
      backgroundColor: "transparent",
    },
  },
};
