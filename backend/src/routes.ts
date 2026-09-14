import { Router } from "express";
import { UrlController } from "./controllers/url.controller";

export class AppRoutes {
  static get routes(): Router {
    const router = Router();

    const urlController = new UrlController();

    router.get("/api/stats", urlController.getStats);
    router.post("/api/url", urlController.createUrl);
    router.post("/api/url/batch-stats", urlController.getBatchStats);
    router.get("/api/url/:shortUrl/stats", urlController.getLinkStats);
    router.get("/api/alias/:alias/available", urlController.checkAlias);
    router.get("/:shortUrl", urlController.getUrl);
    return router;
  }
}
