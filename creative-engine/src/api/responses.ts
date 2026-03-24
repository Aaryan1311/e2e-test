import { randomUUID } from "node:crypto";
import type { ApiResponse } from "../types/api.types.js";

/**
 * Creates a standardized success response.
 */
export function successResponse<T>(
  data: T,
  meta?: Partial<ApiResponse["meta"]>
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      requestId: meta?.requestId ?? randomUUID(),
      duration: meta?.duration ?? 0,
      timestamp: meta?.timestamp ?? new Date().toISOString(),
    },
  };
}

/**
 * Creates a standardized error response.
 */
export function errorResponse(
  code: string,
  message: string,
  details?: unknown
): ApiResponse {
  return {
    success: false,
    error: { code, message, details },
    meta: {
      requestId: randomUUID(),
      duration: 0,
      timestamp: new Date().toISOString(),
    },
  };
}
