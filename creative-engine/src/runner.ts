import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";
import type {
  JobConfig,
  FieldConfig,
  HeaderConfig,
  ResolvedHeader,
  Theme,
} from "./types/index.js";
import { JobConfigSchema } from "./types/index.js";
import { getTheme } from "./config/themes.js";
import { detectTextZone } from "./engine/text-zone-detector.js";
import { calculateSizes } from "./engine/dynamic-sizer.js";
import type { SizedField } from "./engine/dynamic-sizer.js";
import { compose } from "./engine/composer.js";
import { analyzeImageColors } from "./engine/gradient-analyzer.js";
import type { AnalyzedGradient } from "./engine/gradient-analyzer.js";

export async function runJob(jobDir: string): Promise<void> {
  const startTime = Date.now();
  const inputDir = path.join(jobDir, "input");
  const outputDir = path.join(jobDir, "output");

  // 1. Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // 2. Read and validate config.json
  const configPath = path.join(inputDir, "config.json");
  const configRaw = await fs.readFile(configPath, "utf-8");
  const config: JobConfig = JobConfigSchema.parse(JSON.parse(configRaw));

  // 3. Find the background image
  let imagePath: string;
  if (config.image) {
    imagePath = path.resolve(config.image);
  } else {
    const imageFile = await findBackgroundImage(inputDir, config.header?.logo);
    imagePath = path.join(inputDir, imageFile);
  }

  console.log(`[Job] Starting: ${path.basename(jobDir)}`);
  console.log(`[Job] Image: ${path.relative(jobDir, imagePath)}`);
  console.log(`[Job] Composition: ${config.composition}, Account: ${config.account}`);
  console.log(`[Job] Fields: ${config.fields.length}`);

  // 4. Read image dimensions
  const metadata = await sharp(imagePath).metadata();
  const width = metadata.width!;
  const height = metadata.height!;
  console.log(`[Job] Dimensions: ${width}x${height}`);

  // 5. Load theme
  const theme = getTheme(config.account);

  // 6. Detect text zone
  const textZoneResult = await detectTextZone(imagePath, config.composition, theme);
  console.log(
    `[Job] Text zone: ${Math.round(textZoneResult.textZone.width)}x${Math.round(textZoneResult.textZone.height)} at (${Math.round(textZoneResult.textZone.x)}, ${Math.round(textZoneResult.textZone.y)})`,
  );

  // 7. Analyze gradient colors (only if overlay needed)
  let gradientColors: AnalyzedGradient | null = null;
  if (textZoneResult.needsOverlay && !config.gradient?.color) {
    gradientColors = await analyzeImageColors(imagePath, textZoneResult.textZone);
    const d = gradientColors.topColor;
    console.log(`[Job] Gradient colors: rgb(${d.r}, ${d.g}, ${d.b})`);
  }

  // 8. Calculate header space (if header exists)
  let headerHeight = 0;
  let headerConfig: ResolvedHeader | null = null;
  if (config.header) {
    headerConfig = await resolveHeader(config.header, inputDir, width, height, theme);
    headerHeight = headerConfig.totalHeight;
    console.log(`[Job] Header height: ${headerHeight}px`);
  }

  // 9. Adjust text zone to account for header — fields start BELOW the header
  const fieldsTextZone = {
    ...textZoneResult.textZone,
    y: textZoneResult.textZone.y + headerHeight,
    height: textZoneResult.textZone.height - headerHeight,
  };

  // 10. Calculate dynamic sizes for fields
  const textFields = config.fields.map((f) => ({
    type: f.type,
    content: f.content,
    items: f.items,
  }));
  const sizingResult = calculateSizes(textFields, fieldsTextZone);

  // 11. Apply field-level overrides on top of dynamic sizing
  const finalFields = applyOverrides(sizingResult.fields, config.fields);

  console.log(`[Job] Base font size: ${sizingResult.baseFontSize}px`);

  // 12. Compose the final image
  const { imageBuffer, html } = await compose(
    imagePath,
    width,
    height,
    {
      ...textZoneResult,
      textZone: fieldsTextZone,
    },
    { ...sizingResult, fields: finalFields },
    theme,
    headerConfig,
    config.gradient,
    gradientColors,
    config.composition,
  );

  // 13. Save outputs
  const resultPath = path.join(outputDir, "result.png");
  const debugPath = path.join(outputDir, "debug.html");

  await fs.writeFile(resultPath, imageBuffer);
  await fs.writeFile(debugPath, html);

  const duration = Date.now() - startTime;
  console.log(`[Job] Output: ${resultPath} (${(imageBuffer.length / 1024).toFixed(0)}KB)`);
  console.log(`[Job] Debug HTML: ${debugPath}`);
  console.log(`[Job] Complete in ${duration}ms`);
}

async function findBackgroundImage(inputDir: string, logoFilename?: string): Promise<string> {
  const files = await fs.readdir(inputDir);
  const imageExtensions = [".png", ".jpg", ".jpeg", ".webp"];

  const imageFiles = files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    if (!imageExtensions.includes(ext)) return false;
    if (logoFilename && f === logoFilename) return false;
    return true;
  });

  if (imageFiles.length === 0) {
    throw new Error(`No background image found in ${inputDir}`);
  }

  const preferred = imageFiles.find(
    (f) => f.startsWith("image.") || f.startsWith("background.") || f.startsWith("bg."),
  );

  return preferred || imageFiles[0]!;
}

async function resolveHeader(
  header: HeaderConfig,
  inputDir: string,
  imageWidth: number,
  imageHeight: number,
  theme: Theme,
): Promise<ResolvedHeader> {
  const diagonal = Math.sqrt(imageWidth ** 2 + imageHeight ** 2);
  const totalHeaderWidth = Math.round(diagonal / 3);

  const paddingTop = header.padding?.top ?? Math.round(diagonal * 0.02);
  const paddingLeft = header.padding?.left ?? Math.round(diagonal * 0.03);
  const paddingBottom = header.padding?.bottom ?? Math.round(diagonal * 0.015);
  const gap = header.gap ?? Math.round(diagonal * 0.008);

  let logoBase64: string | null = null;
  let logoW = 0;
  let logoH = 0;

  if (header.logo) {
    const logoPath = path.join(inputDir, header.logo);
    try {
      const logoBuffer = await fs.readFile(logoPath);
      const logoMeta = await sharp(logoBuffer).metadata();

      // Logo takes 35% of total header width (unless explicitly overridden)
      logoW = header.logoWidth ?? Math.round(totalHeaderWidth * 0.35);

      // Height from native aspect ratio
      if (header.logoHeight) {
        logoH = header.logoHeight;
      } else if (logoMeta.width && logoMeta.height) {
        logoH = Math.round(logoW * (logoMeta.height / logoMeta.width));
      } else {
        logoH = Math.round(logoW * 0.5);
      }

      const resizedLogo = await sharp(logoBuffer)
        .resize(logoW, logoH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      logoBase64 = `data:image/png;base64,${resizedLogo.toString("base64")}`;
    } catch {
      console.warn(`[Job] Warning: Could not load logo: ${header.logo}`);
    }
  }

  // Product name font size: derived to fit remaining width
  const productName = header.productName ?? null;
  const productNameMaxWidth = totalHeaderWidth - logoW - gap;
  let productNameFontSize = header.productNameFontSize ?? 16;

  if (productName && !header.productNameFontSize) {
    productNameFontSize = Math.round(productNameMaxWidth / (productName.length * 0.55));
    productNameFontSize = Math.max(productNameFontSize, Math.round(diagonal * 0.008));
    productNameFontSize = Math.min(productNameFontSize, Math.round(diagonal * 0.02));
  }

  const contentHeight = Math.max(logoH, productNameFontSize * 1.5);
  const totalHeight = paddingTop + contentHeight + paddingBottom;

  console.log(`[Job] Header: diagonal=${Math.round(diagonal)}px, totalHeaderWidth=${totalHeaderWidth}px, logoWidth=${logoW}px`);

  return {
    logoBase64,
    logoWidth: logoW,
    logoHeight: logoH,
    productName,
    productNameFontSize,
    productNameFontWeight: header.productNameFontWeight ?? "600",
    productNameFontFamily: header.productNameFontFamily ?? theme.fonts.body.family,
    productNameColor: header.productNameColor ?? theme.colors.heading,
    gap,
    paddingTop,
    paddingLeft,
    paddingBottom,
    contentHeight,
    totalHeight,
  };
}

function applyOverrides(sizedFields: SizedField[], configFields: FieldConfig[]): SizedField[] {
  return sizedFields.map((sf, i) => {
    const cf = configFields[i];
    if (!cf) return sf;

    const fontSize = cf.fontSize ?? sf.fontSize;
    const lineHeight = cf.lineHeight
      ? Math.round(fontSize * cf.lineHeight)
      : sf.lineHeight;

    return {
      ...sf,
      fontSize,
      lineHeight,
      gap: cf.marginBottom ?? sf.gap,
      overrides: {
        fontWeight: cf.fontWeight ?? null,
        fontFamily: cf.fontFamily ?? null,
        fontStyle: cf.fontStyle ?? null,
        color: cf.color ?? null,
        letterSpacing: cf.letterSpacing ?? null,
        textTransform: cf.textTransform ?? null,
        textAlign: cf.textAlign ?? null,
        opacity: cf.opacity ?? null,
      },
    };
  });
}
