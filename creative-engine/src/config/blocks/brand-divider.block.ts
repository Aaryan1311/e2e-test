import type { BlockDefinition } from "../../types/block.types.js";

export const brandDividerBlock: BlockDefinition = {
  type: "brand-divider",
  displayName: "Brand Divider",
  positionMode: "stacked",
  priority: 50,
  defaultStyles: {
    textAlign: "center",
    padding: "8px 0",
    maxWidth: "60px",
    opacity: 0.8,
  },
  scalable: false,
  isOptional: true,
  htmlTag: "div",
} as const;
