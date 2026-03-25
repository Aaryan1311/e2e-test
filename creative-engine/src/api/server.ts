import express from "express";
import { router } from "./routes.js";

export function createServer(): ReturnType<typeof express> {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use("/", router);

  // Error handler
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error("[Server] Error:", err.message);
      res.status(500).json({ error: err.message });
    },
  );

  return app;
}

export function startServer(port = 3100) {
  const app = createServer();
  app.listen(port, () => {
    console.log(`[Server] Creative Engine running on port ${port}`);
    console.log(`[Server] Endpoints: POST /render, POST /preview, GET /health`);
  });
}
