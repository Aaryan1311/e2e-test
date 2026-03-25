import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import type { Theme } from "../types/index.js";

const FONT_EXTENSIONS = [".woff2", ".woff", ".ttf", ".otf"] as const;

const FONT_MIME: Record<string, string> = {
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

const WEIGHT_MAP: Record<string, string> = {
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

/**
 * Finds all font files for a font family and generates base64 @font-face CSS.
 */
export async function generateFontFaces(theme: Theme): Promise<string> {
  const fontsDir = resolve(process.cwd(), "assets", "fonts");

  // Collect unique font families
  const fontNames = new Set<string>();
  fontNames.add(theme.fonts.heading.family);
  fontNames.add(theme.fonts.subheading.family);
  fontNames.add(theme.fonts.body.family);

  const declarations: string[] = [];

  for (const fontName of fontNames) {
    const familyFiles = findFontFamilyFiles(fontName, fontsDir);

    if (familyFiles.length > 0) {
      for (const { path: fontPath, weight, style } of familyFiles) {
        const ext = extname(fontPath);
        const mime = FONT_MIME[ext] ?? "font/ttf";
        const buffer = await readFile(fontPath);
        const base64 = buffer.toString("base64");

        declarations.push(`@font-face {
  font-family: '${fontName}';
  src: url('data:${mime};base64,${base64}') format('${ext.slice(1)}');
  font-weight: ${weight};
  font-style: ${style};
  font-display: block;
}`);
      }
    } else {
      console.warn(`[FontLoader] Font "${fontName}" not found in assets/fonts/, using system fallback`);
      declarations.push(`@font-face {
  font-family: '${fontName}';
  src: local('${fontName}'), local('Arial');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}`);
    }
  }

  return declarations.join("\n");
}

function findFontFamilyFiles(
  fontName: string,
  fontsDir: string,
): Array<{ path: string; weight: string; style: string }> {
  const noSpaces = fontName.replace(/\s+/g, "");
  const results: Array<{ path: string; weight: string; style: string }> = [];

  if (!existsSync(fontsDir)) return results;

  for (const ext of FONT_EXTENSIONS) {
    for (const [suffix, weight] of Object.entries(WEIGHT_MAP)) {
      const filePath = join(fontsDir, `${noSpaces}-${suffix}${ext}`);
      if (existsSync(filePath)) {
        results.push({ path: filePath, weight, style: "normal" });
      }

      // Italic variants
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
