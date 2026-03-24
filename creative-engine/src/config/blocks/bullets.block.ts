import type { BlockDefinition } from "../../types/block.types.js";

export const bulletsBlock: BlockDefinition = {
  type: "bullets",
  displayName: "Bullet Points",
  positionMode: "stacked",
  priority: 30,
  defaultStyles: {
    fontFamily: "Arial",
    fontSize: "20px",
    fontWeight: "400",
    lineHeight: 1.5,
    color: "#FFFFFF",
    textAlign: "left",
    padding: "0 0 0 20px",
    maxWidth: "100%",
  },
  scalable: true,
  minFontSize: "14px",
  maxLines: 6,
  isOptional: true,
  htmlTag: "ul",
} as const;
