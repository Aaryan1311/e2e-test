import puppeteer, { type Browser } from "puppeteer-core";

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

const CHROME_PATH =
  process.env["CHROME_PATH"] ??
  "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome";

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

export class BrowserPool {
  private config: BrowserPoolConfig;
  private browsers: PooledBrowser[] = [];
  private draining = false;

  constructor(config?: Partial<BrowserPoolConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private async createBrowser(): Promise<Browser> {
    return puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: LAUNCH_ARGS,
    });
  }

  async acquire(): Promise<Browser> {
    if (this.draining) {
      throw new Error("[BrowserPool] Pool is draining, cannot acquire");
    }

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

    this.browsers = this.browsers.filter((e) => e.browser.connected);

    if (this.browsers.length < this.config.maxInstances) {
      const browser = await this.createBrowser();
      const entry: PooledBrowser = { browser, inUse: true };
      this.browsers.push(entry);
      return browser;
    }

    throw new Error(
      `[BrowserPool] All ${this.config.maxInstances} browsers in use`,
    );
  }

  async release(browser: Browser): Promise<void> {
    const entry = this.browsers.find((e) => e.browser === browser);
    if (!entry) return;

    entry.inUse = false;

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

  getStats(): { total: number; available: number; inUse: number } {
    const connected = this.browsers.filter((e) => e.browser.connected);
    return {
      total: connected.length,
      available: connected.filter((e) => !e.inUse).length,
      inUse: connected.filter((e) => e.inUse).length,
    };
  }
}

export const browserPool = new BrowserPool();

const cleanup = async () => {
  await browserPool.drain();
  process.exit(0);
};

process.on("SIGINT", () => {
  void cleanup();
});
process.on("SIGTERM", () => {
  void cleanup();
});
