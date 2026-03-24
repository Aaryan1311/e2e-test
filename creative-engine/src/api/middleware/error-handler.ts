import type { Request, Response, NextFunction } from "express";
import { errorResponse } from "../responses.js";

/**
 * Global Express error handler.
 * Formats errors into standardized API responses.
 * Never exposes stack traces to clients.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation error
  if (err.name === "ZodError" || (err as unknown as Record<string, unknown>)["issues"]) {
    res.status(400).json(
      errorResponse("VALIDATION_ERROR", "Request validation failed", {
        issues: (err as unknown as Record<string, unknown>)["issues"] ?? err.message,
      })
    );
    return;
  }

  // Known engine errors (theme/block/canvas not found)
  if (err.message.includes("is not registered") || err.message.includes("not found")) {
    const statusCode = err.message.includes("not found") ? 404 : 400;
    res.status(statusCode).json(
      errorResponse("NOT_FOUND", err.message)
    );
    return;
  }

  // Pipeline validation errors
  if (err.message.includes("[Pipeline]")) {
    res.status(400).json(
      errorResponse("PIPELINE_ERROR", err.message.replace("[Pipeline] ", ""))
    );
    return;
  }

  // Unexpected errors
  console.error("[API] Unexpected error:", err);
  res.status(500).json(
    errorResponse("INTERNAL_ERROR", "An unexpected error occurred")
  );
}
