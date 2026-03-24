import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import type { ThemeDefinition } from "../../types/index.js";

/** Supported font file extensions in priority order */
const FONT_EXTENSIONS = [".woff2", ".woff", ".ttf", ".otf"] as const;

/** MIME types for font formats */
const FONT_MIME: Record<string, string> = {
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

/**
 * Attempts to find a font file in assets/fonts/ matching the given font name.
 * Tries various naming conventions: exact name, lowercase, hyphenated, etc.
 */
function findFontFile(fontName: string, fontsDir: string): string | null {
  const candidates = [
    fontName,
    fontName.toLowerCase(),
    fontName.replace(/\s+/g, "-"),
    fontName.replace(/\s+/g, "-").toLowerCase(),
    fontName.replace(/\s+/g, ""),
    fontName.replace(/\s+/g, "").toLowerCase(),
  ];

  for (const candidate of candidates) {
    for (const ext of FONT_EXTENSIONS) {
      const filePath = join(fontsDir, `${candidate}${ext}`);
      if (existsSync(filePath)) {
        return filePath;
      }
    }
  }
  return null;
}

/**
 * Generates a fallback font-family string based on the font name.
 */
function getFallbackStack(fontName: string): string {
  const lower = fontName.toLowerCase();
  if (lower.includes("bold") || lower.includes("black")) {
    return "'Arial Black', 'Helvetica Bold', sans-serif";
  }
  if (lower.includes("light") || lower.includes("thin")) {
    return "'Helvetica Neue Light', Arial, sans-serif";
  }
  if (lower.includes("georgia") || lower.includes("serif")) {
    return "Georgia, 'Times New Roman', serif";
  }
  return "Arial, Helvetica, sans-serif";
}

/**
 * Generates @font-face CSS declarations for all fonts referenced in the theme.
 *
 * For each unique font:
 * 1. Checks assets/fonts/ for a matching font file
 * 2. If found, embeds as base64 data URI
 * 3. If not found, generates a fallback @font-face mapping to system fonts
 */
export async function generateFontFaces(theme: ThemeDefinition): Promise<string> {
  const fontsDir = resolve(process.cwd(), "assets", "fonts");

  // Collect unique font names from theme
  const fontNames = new Set<string>();
  fontNames.add(theme.typography.headingFont);
  fontNames.add(theme.typography.bodyFont);
  if (theme.typography.ctaFont) {
    fontNames.add(theme.typography.ctaFont);
  }

  const declarations: string[] = [];

  for (const fontName of fontNames) {
    const fontFile = findFontFile(fontName, fontsDir);

    if (fontFile) {
      const ext = FONT_EXTENSIONS.find((e) => fontFile.endsWith(e)) ?? ".ttf";
      const mime = FONT_MIME[ext] ?? "font/ttf";
      const buffer = await readFile(fontFile);
      const base64 = buffer.toString("base64");

      declarations.push(`
        @font-face {
          font-family: '${fontName}';
          src: url('data:${mime};base64,${base64}') format('${ext.slice(1)}');
          font-weight: normal;
          font-style: normal;
          font-display: block;
        }
      `);
    } else {
      console.warn(`[HTMLBuilder] Font "${fontName}" not found in assets/fonts/, using system fallback`);
      const fallback = getFallbackStack(fontName);
      declarations.push(`
        @font-face {
          font-family: '${fontName}';
          src: local('${fontName}'), local('${fallback.split(",")[0]!.trim().replace(/'/g, "")}');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `);
    }
  }

  return declarations.join("\n");
}
