import type { ThemeColors } from "./theme.types.js";

/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId: string;
    duration: number;
    timestamp: string;
  };
}

/** Response for render endpoint */
export interface RenderApiResponse {
  renders: Array<{
    aspectRatio: string;
    canvasId: string;
    width: number;
    height: number;
    imageUrl?: string;
    imageBase64?: string;
    quality: {
      score: number;
      passed: boolean;
      checks: Record<string, boolean>;
      warnings: string[];
    };
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    totalDuration: number;
  };
}

/** Response for block list config endpoint */
export interface BlockListResponse {
  blocks: Array<{
    type: string;
    displayName: string;
    positionMode: string;
    priority: number;
    isOptional: boolean;
  }>;
}

/** Response for theme list config endpoint */
export interface ThemeListResponse {
  themes: Array<{
    id: string;
    displayName: string;
    colors: ThemeColors;
  }>;
}

/** Response for canvas list config endpoint */
export interface CanvasListResponse {
  canvases: Array<{
    id: string;
    name: string;
    aspectRatio: string;
    width: number;
    height: number;
  }>;
}
