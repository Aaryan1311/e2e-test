import type { LayoutResult, QualityCheckResult, QualityCheck, QualityWarning } from "../types.js";
import { checkOverlaps } from "./overlap-checker.js";
import { checkOverflow } from "./overflow-checker.js";
import { checkContrast } from "./contrast-checker.js";
import { checkSpacing } from "./spacing-checker.js";
import { checkFontSizes } from "./font-size-checker.js";

/**
 * Runs all quality checks on a LayoutResult and returns an aggregated result.
 *
 * - `passed` is true only if ALL error-severity checks pass (warnings don't block).
 * - `score` starts at 100, subtracts 30 per error, 10 per warning, floor at 0.
 */
export function checkQuality(layoutResult: LayoutResult): QualityCheckResult {
  const allBlocks = [...layoutResult.stackedBlocks, ...layoutResult.pinnedBlocks];

  const checks: QualityCheck[] = [
    checkOverlaps(layoutResult.stackedBlocks, layoutResult.pinnedBlocks),
    checkOverflow(allBlocks, layoutResult.canvas),
    checkContrast(allBlocks, layoutResult.overlay, layoutResult.theme),
    checkSpacing(layoutResult.stackedBlocks, layoutResult.theme),
    checkFontSizes(allBlocks),
  ];

  const warnings: QualityWarning[] = [];
  for (const check of checks) {
    if (!check.passed) {
      warnings.push({
        message: `[${check.name}] ${check.details}`,
        suggestion: getSuggestion(check.name),
      });
    }
  }

  const errors = checks.filter((c) => !c.passed && c.severity === "error");
  const warningChecks = checks.filter((c) => !c.passed && c.severity === "warning");
  const passed = errors.length === 0;

  let score = 100;
  score -= errors.length * 30;
  score -= warningChecks.length * 10;
  score = Math.max(0, score);

  return { passed, checks, warnings, score };
}

function getSuggestion(checkName: string): string {
  switch (checkName) {
    case "overlap":
      return "Increase blockGap in theme or reduce the number of blocks";
    case "overflow":
      return "Reduce content length or allow font scaling on more blocks";
    case "contrast":
      return "Adjust text color or increase overlay opacity for better readability";
    case "spacing":
      return "Increase blockGap in theme layout settings";
    case "font-size":
      return "Increase minimum font size or reduce content to fit without extreme scaling";
    default:
      return "Review layout configuration";
  }
}
