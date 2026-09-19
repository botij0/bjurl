import express, { Router } from "express";
import path from "path";
import cors from "cors";

import { buildLogger } from "./config/logger";

interface Options {
  port: number;
  routes: Router;
  publicPath: string;
  corsOrigin: string;
}

export function parseCorsOrigin(corsOrigin: string): "*" | string[] {
  if (corsOrigin.trim() === "*") return "*";
  return corsOrigin
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export class Server {
  private app = express();
  private readonly port: number;
  private readonly routes: Router;
  private readonly publicPath: string;
  private readonly corsOrigin: string;
  private readonly logger = buildLogger("server");

  constructor(options: Options) {
    const { port, routes, publicPath, corsOrigin } = options;
    this.port = port;
    this.routes = routes;
    this.publicPath = publicPath;
    this.corsOrigin = corsOrigin;
  }

  async start() {
    // Middlewares
    this.app.set("trust proxy", 1);
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    // CORS_ORIGIN is "*" by default because this is a public shortener.
    // Set it to a comma-separated allow-list to restrict cross-origin callers.
    this.app.use(
      cors({
        origin: parseCorsOrigin(this.corsOrigin),
      }),
    );

    // Public path
    this.app.use(express.static(this.publicPath));

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        this.logger.log("Request", {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: duration,
        });
      });
      next();
    });

    // Routes
    this.app.use(this.routes);

    // Unknown API routes
    this.app.use("/api", (req, res) => {
      res.status(404).json({ error: "Not found" });
    });

    // SPA fallback
    this.app.get(/(.*)/, (req, res) => {
      const indexPath = path.join(__dirname, `../${this.publicPath}/index.html`);
      res.sendFile(indexPath);
    });

    this.app.listen(this.port, () => {
      this.logger.log("Server started", { port: this.port });
    });
  }
}
