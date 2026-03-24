import puppeteer, { type Browser } from "puppeteer-core";

/** Configuration for the browser pool */
interface BrowserPoolConfig {
  minInstances: number;
  maxInstances: number;
  idleTimeoutMs: number;
}

const DEFAULT_CONFIG: BrowserPoolConfig = {
  minInstances: 1,
  maxInstances: 5,
  idleTimeoutMs: 60000,
};

/** Path to the system Chromium binary */
const CHROME_PATH = process.env["CHROME_PATH"] ??
  "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome";

/** Chrome launch arguments for stability in containerized environments */
const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--disable-software-rasterizer",
  "--single-process",
];

interface PooledBrowser {
  browser: Browser;
  inUse: boolean;
  idleTimer?: ReturnType<typeof setTimeout>;
}

/**
 * Manages a pool of reusable Puppeteer browser instances to avoid
 * the cold start cost of launching a new browser per render.
 */
export class BrowserPool {
  private config: BrowserPoolConfig;
  private browsers: PooledBrowser[] = [];
  private draining = false;

  constructor(config?: Partial<BrowserPoolConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Launches a new browser instance.
   */
  private async createBrowser(): Promise<Browser> {
    return puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: LAUNCH_ARGS,
    });
  }

  /**
   * Acquire a browser instance from the pool.
   * Returns an available browser or creates a new one if under maxInstances.
   */
  async acquire(): Promise<Browser> {
    if (this.draining) {
      throw new Error("[BrowserPool] Pool is draining, cannot acquire");
    }

    // Look for an available browser
    for (const entry of this.browsers) {
      if (!entry.inUse && entry.browser.connected) {
        if (entry.idleTimer) {
          clearTimeout(entry.idleTimer);
          entry.idleTimer = undefined;
        }
        entry.inUse = true;
        return entry.browser;
      }
    }

    // Remove disconnected browsers
    this.browsers = this.browsers.filter((e) => e.browser.connected);

    // Create new if under limit
    if (this.browsers.length < this.config.maxInstances) {
      const browser = await this.createBrowser();
      const entry: PooledBrowser = { browser, inUse: true };
      this.browsers.push(entry);
      return browser;
    }

    // At capacity — wait briefly for one to free up
    throw new Error(
      `[BrowserPool] All ${this.config.maxInstances} browsers in use, cannot acquire`
    );
  }

  /**
   * Return a browser instance to the pool.
   */
  async release(browser: Browser): Promise<void> {
    const entry = this.browsers.find((e) => e.browser === browser);
    if (!entry) return;

    entry.inUse = false;

    // Set idle timeout to close browser if not reused
    entry.idleTimer = setTimeout(async () => {
      if (!entry.inUse && entry.browser.connected) {
        try {
          await entry.browser.close();
        } catch {
          // Ignore close errors
        }
        this.browsers = this.browsers.filter((e) => e !== entry);
      }
    }, this.config.idleTimeoutMs);
  }

  /**
   * Close all browser instances. Call on shutdown.
   */
  async drain(): Promise<void> {
    this.draining = true;
    const closePromises = this.browsers.map(async (entry) => {
      if (entry.idleTimer) clearTimeout(entry.idleTimer);
      try {
        if (entry.browser.connected) {
          await entry.browser.close();
        }
      } catch {
        // Ignore close errors during drain
      }
    });
    await Promise.all(closePromises);
    this.browsers = [];
  }

  /** Get pool stats for monitoring */
  getStats(): { total: number; available: number; inUse: number } {
    const connected = this.browsers.filter((e) => e.browser.connected);
    return {
      total: connected.length,
      available: connected.filter((e) => !e.inUse).length,
      inUse: connected.filter((e) => e.inUse).length,
    };
  }
}

/** Singleton browser pool instance */
export const browserPool = new BrowserPool();

// Clean up on process exit
const cleanup = async () => {
  await browserPool.drain();
  process.exit(0);
};

process.on("SIGINT", () => { void cleanup(); });
process.on("SIGTERM", () => { void cleanup(); });
