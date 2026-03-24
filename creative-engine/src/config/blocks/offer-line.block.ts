import type { BlockDefinition } from "../../types/block.types.js";

export const offerLineBlock: BlockDefinition = {
  type: "offer-line",
  displayName: "Offer Line",
  positionMode: "stacked",
  priority: 25,
  defaultStyles: {
    fontFamily: "Arial",
    fontSize: "24px",
    fontWeight: "bold",
    lineHeight: 1.3,
    color: "#FFD700",
    textAlign: "left",
    maxWidth: "100%",
  },
  scalable: true,
  minFontSize: "16px",
  maxLines: 1,
  isOptional: true,
  htmlTag: "p",
} as const;
