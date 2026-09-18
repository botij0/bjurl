import express, { Router } from "express";
import path from "path";
import cors from "cors";

import { buildLogger } from "./config/logger";

interface Options {
  port: number;
  routes: Router;
  publicPath: string;
}

export class Server {
  private app = express();
  private readonly port: number;
  private readonly routes: Router;
  private readonly publicPath: string;
  private readonly logger = buildLogger("server");

  constructor(options: Options) {
    const { port, routes, publicPath } = options;
    this.port = port;
    this.routes = routes;
    this.publicPath = publicPath;
  }

  async start() {
    // Middlewares
    this.app.set("trust proxy", 1);
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cors());

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
