import type { BlockDefinition } from "../../types/block.types.js";

export const disclaimerBlock: BlockDefinition = {
  type: "disclaimer",
  displayName: "Disclaimer",
  positionMode: "pinned",
  pinPosition: "bottom-strip",
  priority: 100,
  defaultStyles: {
    fontFamily: "Arial",
    fontSize: "10px",
    fontWeight: "400",
    lineHeight: 1.2,
    color: "#CCCCCC",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    textAlign: "left",
    padding: "8px 16px",
    maxWidth: "100%",
    opacity: 0.9,
  },
  scalable: false,
  isOptional: true,
  htmlTag: "p",
} as const;
