import type { ThemeDefinition } from "../../types/theme.types.js";

export const solitaireTheme: ThemeDefinition = {
  id: "solitaire",
  displayName: "Kotak Solitaire",
  colors: {
    primary: "#C9A84C",
    secondary: "#0D1B3E",
    accent: "#E8D5A3",
    headingColor: "#C9A84C",
    subheadingColor: "#E8D5A3",
    bodyColor: "#F0EDE4",
    ctaBackground: "#C9A84C",
    ctaTextColor: "#0D1B3E",
    disclaimerBackground: "rgba(13, 27, 62, 0.85)",
    disclaimerTextColor: "#A0A0A0",
  },
  typography: {
    headingFont: "Georgia",
    bodyFont: "Arial",
    ctaFont: "Georgia",
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
    value: "linear-gradient(to right, rgba(13,27,62,0.9) 0%, rgba(13,27,62,0.6) 45%, rgba(13,27,62,0) 70%)",
    fallbackOpacity: 0.5,
  },
  logo: {
    src: "kotak-solitaire-logo.png",
    width: "140px",
    height: "45px",
  },
  blockOverrides: {
    heading: {
      color: "#C9A84C",
      fontFamily: "Georgia",
      fontSize: "46px",
      letterSpacing: "1px",
    },
    subheading: {
      color: "#E8D5A3",
      fontFamily: "Georgia",
      fontStyle: "italic",
      fontWeight: "400",
    },
    cta: {
      backgroundColor: "#C9A84C",
      color: "#0D1B3E",
      borderRadius: "4px",
      fontFamily: "Georgia",
      textTransform: "uppercase",
      letterSpacing: "2px",
    },
    "offer-line": {
      color: "#C9A84C",
    },
    "brand-divider": {
      opacity: 0.6,
    },
    disclaimer: {
      backgroundColor: "rgba(13, 27, 62, 0.85)",
      color: "#A0A0A0",
    },
  },
};
