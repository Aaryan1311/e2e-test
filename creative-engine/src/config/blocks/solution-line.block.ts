import type { BlockDefinition } from "../../types/block.types.js";

export const solutionLineBlock: BlockDefinition = {
  type: "solution-line",
  displayName: "Solution Line",
  positionMode: "stacked",
  priority: 35,
  defaultStyles: {
    fontFamily: "Arial",
    fontSize: "22px",
    fontWeight: "400",
    lineHeight: 1.4,
    color: "#FFFFFF",
    textAlign: "left",
    maxWidth: "100%",
  },
  scalable: true,
  minFontSize: "14px",
  maxLines: 2,
  isOptional: true,
  htmlTag: "p",
} as const;
