import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod/v4";

/**
 * Factory function that creates Express middleware for Zod validation.
 * Validates req.body against the given schema.
 * If valid, attaches parsed data to req.body and calls next().
 * If invalid, passes the error to the error handler.
 */
export function validate(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (result.success) {
      req.body = result.data;
      next();
    } else {
      const error = new Error("Validation failed");
      error.name = "ZodError";
      (error as unknown as Record<string, unknown>)["issues"] = result.error.issues;
      next(error);
    }
  };
}
