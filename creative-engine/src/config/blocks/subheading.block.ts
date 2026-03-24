import type { BlockDefinition } from "../../types/block.types.js";

export const subheadingBlock: BlockDefinition = {
  type: "subheading",
  displayName: "Subheading",
  positionMode: "stacked",
  priority: 20,
  defaultStyles: {
    fontFamily: "Arial",
    fontSize: "32px",
    fontWeight: "400",
    fontStyle: "italic",
    lineHeight: 1.3,
    color: "#FFFFFF",
    textAlign: "left",
    maxWidth: "100%",
  },
  scalable: true,
  minFontSize: "20px",
  maxLines: 2,
  isOptional: true,
  htmlTag: "h2",
} as const;
