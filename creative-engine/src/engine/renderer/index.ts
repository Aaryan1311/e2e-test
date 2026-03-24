import type { CanvasDefinition } from "../../types/index.js";
import { browserPool } from "./browser-pool.js";
import { takeScreenshot } from "./screenshot.js";

/**
 * Renders HTML to a PNG image buffer at the specified canvas dimensions.
 *
 * Acquires a browser from the pool, takes a screenshot, and releases
 * the browser back. Always releases in a finally block to prevent
 * pool exhaustion on errors.
 */
export async function renderToImage(
  html: string,
  canvas: CanvasDefinition
): Promise<Buffer> {
  const browser = await browserPool.acquire();
  try {
    return await takeScreenshot(html, canvas, browser);
  } finally {
    await browserPool.release(browser);
  }
}

/**
 * Renders multiple layout/canvas combinations concurrently.
 *
 * Each entry needs its own HTML because block positions differ per aspect ratio.
 * Returns a Map keyed by canvas aspectRatio.
 */
export async function renderBatch(
  layouts: Array<{ html: string; canvas: CanvasDefinition }>
): Promise<Map<string, Buffer>> {
  const results = await Promise.all(
    layouts.map(async ({ html, canvas }) => {
      const buffer = await renderToImage(html, canvas);
      return { aspectRatio: canvas.aspectRatio, buffer };
    })
  );

  const map = new Map<string, Buffer>();
  for (const { aspectRatio, buffer } of results) {
    map.set(aspectRatio, buffer);
  }
  return map;
}
