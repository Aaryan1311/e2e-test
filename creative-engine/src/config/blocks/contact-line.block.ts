import type { BlockDefinition } from "../../types/block.types.js";

export const contactLineBlock: BlockDefinition = {
  type: "contact-line",
  displayName: "Contact Line",
  positionMode: "stacked",
  priority: 70,
  defaultStyles: {
    fontFamily: "Arial",
    fontSize: "14px",
    fontWeight: "400",
    lineHeight: 1.3,
    color: "#FFFFFF",
    textAlign: "left",
    maxWidth: "100%",
  },
  scalable: false,
  maxLines: 1,
  isOptional: true,
  htmlTag: "p",
} as const;
