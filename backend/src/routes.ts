import { Router } from "express";
import { UrlController } from "./controllers/url.controller";
import { RESERVED_ALIASES } from "./config/aliases";
import { prismaLinkStore } from "./data/prisma-link-store";
import { UrlService } from "./services/url.service";

export class AppRoutes {
  static get routes(): Router {
    const router = Router();

    const urlController = new UrlController(new UrlService(prismaLinkStore));

    router.get("/api/stats", urlController.getStats);
    router.post("/api/url", urlController.createUrl);
    router.post("/api/url/batch-stats", urlController.getBatchStats);
    router.get("/api/url/:shortUrl/stats", urlController.getLinkStats);
    router.get("/api/alias/:alias/available", urlController.checkAlias);
    router.get(
      "/:shortUrl",
      (req, _res, next) => {
        const { shortUrl } = req.params;
        if (typeof shortUrl === "string" && RESERVED_ALIASES.has(shortUrl.toLowerCase())) {
          return next("route");
        }
        next();
      },
      urlController.getUrl,
    );
    return router;
  }
}
