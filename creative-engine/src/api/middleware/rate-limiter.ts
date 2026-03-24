import type { Request, Response, NextFunction } from "express";
import { errorResponse } from "../responses.js";

const MAX_REQUESTS = parseInt(process.env["RATE_LIMIT_MAX"] ?? "30", 10);
const WINDOW_MS = parseInt(process.env["RATE_LIMIT_WINDOW_MS"] ?? "60000", 10);

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, WINDOW_MS);

/**
 * Simple in-memory rate limiter.
 * Tracks requests per IP with a sliding window.
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const now = Date.now();

  let entry = store.get(ip);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(ip, entry);
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.set("Retry-After", String(retryAfter));
    res.status(429).json(
      errorResponse(
        "RATE_LIMITED",
        `Too many requests. Try again in ${retryAfter} seconds.`
      )
    );
    return;
  }

  next();
}
