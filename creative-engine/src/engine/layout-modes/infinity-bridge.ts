/**
 * Generates an SVG path data string for an infinity symbol (∞).
 *
 * The symbol is essentially two overlapping circles forming a figure-eight
 * that fits within the given width × height bounding box.
 */
export function generateInfinityBridgePath(width: number, height: number): string {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 4;
  const ry = height / 2.5;

  // Two overlapping elliptical arcs forming a figure-eight
  return [
    `M ${cx} ${cy}`,
    `C ${cx + rx} ${cy - ry}, ${cx + rx * 2} ${cy - ry}, ${cx + rx * 2} ${cy}`,
    `C ${cx + rx * 2} ${cy + ry}, ${cx + rx} ${cy + ry}, ${cx} ${cy}`,
    `C ${cx - rx} ${cy - ry}, ${cx - rx * 2} ${cy - ry}, ${cx - rx * 2} ${cy}`,
    `C ${cx - rx * 2} ${cy + ry}, ${cx - rx} ${cy + ry}, ${cx} ${cy}`,
    "Z",
  ].join(" ");
}
