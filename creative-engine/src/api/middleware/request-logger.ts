import type { Request, Response, NextFunction } from "express";

/**
 * Logs incoming requests on entry and outgoing responses with timing.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers["x-request-id"] as string ?? crypto.randomUUID();
  const start = process.hrtime.bigint();

  // Attach requestId for use in handlers
  (req as unknown as Record<string, unknown>)["requestId"] = requestId;

  console.log(`[API] ${req.method} ${req.path} — requestId: ${requestId}`);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    console.log(
      `[API] ${req.method} ${req.path} — ${res.statusCode} (${Math.round(durationMs)}ms) — requestId: ${requestId}`
    );
  });

  next();
}
