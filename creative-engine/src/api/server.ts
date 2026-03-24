import express from "express";
import { router } from "./routes.js";
import { requestLogger } from "./middleware/request-logger.js";
import { rateLimiter } from "./middleware/rate-limiter.js";
import { errorHandler } from "./middleware/error-handler.js";

/**
 * Creates and configures the Express application.
 * Does NOT call app.listen() — returns the app instance.
 */
export function createServer(): express.Express {
  const app = express();

  // Parse JSON body with 10MB limit (base64 images can be large)
  app.use(express.json({ limit: "10mb" }));

  // CORS — allow all origins for development
  app.use((_req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, X-Request-Id");
    if (_req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Global middleware
  app.use(requestLogger);
  app.use(rateLimiter);

  // Routes
  app.use(router);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Starts the Express server on the configured port.
 */
export async function startServer(): Promise<void> {
  const port = parseInt(process.env["PORT"] ?? "3100", 10);
  const app = createServer();

  return new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.log(`[Server] Creative Engine API running on port ${port}`);
      console.log(
        "[Server] Endpoints: POST /render, POST /preview, GET /health, GET /config/*"
      );
      resolve();
    });
  });
}
