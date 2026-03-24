import type { BlockDefinition } from "../../types/block.types.js";

export const ctaBlock: BlockDefinition = {
  type: "cta",
  displayName: "Call to Action",
  positionMode: "stacked",
  priority: 80,
  defaultStyles: {
    fontFamily: "Arial",
    fontSize: "18px",
    fontWeight: "bold",
    lineHeight: 1.2,
    color: "#FFFFFF",
    backgroundColor: "#E52E2E",
    textAlign: "center",
    padding: "14px 32px",
    borderRadius: "8px",
    textTransform: "uppercase",
  },
  scalable: false,
  maxLines: 1,
  isOptional: true,
  htmlTag: "div",
} as const;
