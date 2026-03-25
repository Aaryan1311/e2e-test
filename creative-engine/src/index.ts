import { startServer } from "./api/server.js";

const port = parseInt(process.env["PORT"] ?? "3100", 10);
startServer(port);
