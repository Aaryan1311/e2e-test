import type { BlockDefinition } from "../../types/block.types.js";

export const headingBlock: BlockDefinition = {
  type: "heading",
  displayName: "Heading",
  positionMode: "stacked",
  priority: 10,
  defaultStyles: {
    fontFamily: "Arial",
    fontSize: "48px",
    fontWeight: "bold",
    lineHeight: 1.2,
    color: "#FFFFFF",
    textAlign: "left",
    maxWidth: "100%",
  },
  scalable: true,
  minFontSize: "28px",
  maxLines: 2,
  isOptional: false,
  htmlTag: "h1",
} as const;
