import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, extname } from "node:path";
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
 * Tries various naming conventions: exact name, lowercase, hyphenated,
 * and also matches "Source Sans 3" to "SourceSans3-Regular.ttf" patterns.
 */
function findFontFile(fontName: string, fontsDir: string): string | null {
  // Normalize font name: "Source Sans 3" → "SourceSans3", "sourcesans3"
  const noSpaces = fontName.replace(/\s+/g, "");
  const hyphenated = fontName.replace(/\s+/g, "-");

  const candidates = [
    fontName,
    fontName.toLowerCase(),
    hyphenated,
    hyphenated.toLowerCase(),
    noSpaces,
    noSpaces.toLowerCase(),
    // Also try with -Regular suffix (common for font families)
    `${noSpaces}-Regular`,
    `${noSpaces}-regular`,
    `${hyphenated}-Regular`,
    `${hyphenated}-regular`,
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
 * Finds all font files for a font family (e.g., "Source Sans 3" → SourceSans3-*.ttf).
 * Returns an array of { path, weight, style } entries.
 */
function findFontFamilyFiles(
  fontName: string,
  fontsDir: string
): Array<{ path: string; weight: string; style: string }> {
  const noSpaces = fontName.replace(/\s+/g, "");
  const results: Array<{ path: string; weight: string; style: string }> = [];

  if (!existsSync(fontsDir)) return results;

  // Weight mapping from filename suffixes
  const weightMap: Record<string, string> = {
    Thin: "100",
    ExtraLight: "200",
    Light: "300",
    Regular: "400",
    Medium: "500",
    SemiBold: "600",
    Bold: "700",
    ExtraBold: "800",
    Black: "900",
  };

  for (const ext of FONT_EXTENSIONS) {
    for (const [suffix, weight] of Object.entries(weightMap)) {
      const baseName = `${noSpaces}-${suffix}`;
      const filePath = join(fontsDir, `${baseName}${ext}`);
      if (existsSync(filePath)) {
        results.push({ path: filePath, weight, style: "normal" });
      }

      // Also check italic variants
      const italicPath = join(fontsDir, `${noSpaces}-${suffix}Italic${ext}`);
      if (existsSync(italicPath)) {
        results.push({ path: italicPath, weight, style: "italic" });
      }
      // MediumItalic pattern
      if (suffix === "Medium") {
        const medItalicPath = join(fontsDir, `${noSpaces}-MediumItalic${ext}`);
        if (existsSync(medItalicPath)) {
          results.push({ path: medItalicPath, weight: "500", style: "italic" });
        }
      }
    }
  }

  return results;
}

/**
 * Generates a fallback font-family string based on the font name.
 */
function getFallbackStack(fontName: string): string {
  const lower = fontName.toLowerCase();
  if (lower.includes("serif") && !lower.includes("sans")) {
    return "Georgia, 'Times New Roman', serif";
  }
  if (lower.includes("bold") || lower.includes("black")) {
    return "'Arial Black', 'Helvetica Bold', sans-serif";
  }
  if (lower.includes("light") || lower.includes("thin")) {
    return "'Helvetica Neue Light', Arial, sans-serif";
  }
  return "Arial, Helvetica, sans-serif";
}

/**
 * Generates @font-face CSS declarations for all fonts referenced in the theme.
 *
 * For each unique font:
 * 1. Searches assets/fonts/ for matching font files (including weight variants)
 * 2. If found, embeds as base64 data URIs
 * 3. If not found, generates a fallback @font-face mapping to system fonts
 */
export async function generateFontFaces(theme: ThemeDefinition): Promise<string> {
  const fontsDir = resolve(process.cwd(), "assets", "fonts");

  // Collect unique font names from theme + blockOverrides
  const fontNames = new Set<string>();
  fontNames.add(theme.typography.headingFont);
  fontNames.add(theme.typography.bodyFont);
  if (theme.typography.ctaFont) {
    fontNames.add(theme.typography.ctaFont);
  }

  // Also check blockOverrides for additional font families
  for (const overrides of Object.values(theme.blockOverrides)) {
    if (overrides.fontFamily) fontNames.add(overrides.fontFamily);
  }
  if (theme.splitModeBlockOverrides) {
    for (const overrides of Object.values(theme.splitModeBlockOverrides)) {
      if (overrides.fontFamily) fontNames.add(overrides.fontFamily);
    }
  }

  const declarations: string[] = [];

  for (const fontName of fontNames) {
    // First try to find a family of font files with weight variants
    const familyFiles = findFontFamilyFiles(fontName, fontsDir);

    if (familyFiles.length > 0) {
      for (const { path: fontPath, weight, style } of familyFiles) {
        const ext = extname(fontPath);
        const mime = FONT_MIME[ext] ?? "font/ttf";
        const buffer = await readFile(fontPath);
        const base64 = buffer.toString("base64");

        declarations.push(`
        @font-face {
          font-family: '${fontName}';
          src: url('data:${mime};base64,${base64}') format('${ext.slice(1)}');
          font-weight: ${weight};
          font-style: ${style};
          font-display: block;
        }
        `);
      }
    } else {
      // Try single file match
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
  }

  return declarations.join("\n");
}
