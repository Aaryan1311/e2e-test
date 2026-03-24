import type { Browser } from "puppeteer-core";
import type { CanvasDefinition } from "../../types/index.js";

/**
 * Takes a screenshot of the given HTML at exact canvas dimensions.
 *
 * Steps:
 * 1. Creates a new page with exact viewport dimensions
 * 2. Sets the HTML content and waits for rendering
 * 3. Waits 500ms for font rendering to settle
 * 4. Takes a clipped PNG screenshot
 * 5. Closes the page (not the browser)
 *
 * Retries once on failure after a 1-second delay.
 */
export async function takeScreenshot(
  html: string,
  canvas: CanvasDefinition,
  browser: Browser
): Promise<Buffer> {
  async function attempt(): Promise<Buffer> {
    const page = await browser.newPage();
    try {
      await page.setViewport({
        width: canvas.width,
        height: canvas.height,
        deviceScaleFactor: 1,
      });

      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: 15000,
      });

      // Wait for font rendering to settle
      await new Promise((resolve) => setTimeout(resolve, 500));

      const screenshot = await page.screenshot({
        type: "png",
        fullPage: false,
        clip: {
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height,
        },
      });

      // Puppeteer returns Uint8Array, convert to Buffer
      return Buffer.from(screenshot);
    } finally {
      await page.close();
    }
  }

  try {
    return await attempt();
  } catch (firstError) {
    console.warn(
      `[Renderer] Screenshot failed, retrying in 1s: ${firstError instanceof Error ? firstError.message : String(firstError)}`
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      return await attempt();
    } catch (retryError) {
      throw new Error(
        `[Renderer] Screenshot failed after retry for ${canvas.id} (${canvas.width}x${canvas.height}): ${retryError instanceof Error ? retryError.message : String(retryError)}`
      );
    }
  }
}
