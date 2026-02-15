import type { Request, Response } from "express";

import { UrlService } from "../services/url.service";
import { CreateUrlDto } from "../data/dtos/create-url.dto";
import { buildLogger } from "../config/logger";
import { envs } from "../config/envs";

export class UrlController {
  private urlService: UrlService;
  private readonly logger = buildLogger("url.controller");

  constructor() {
    this.urlService = new UrlService();
  }

  public getUrl = async (req: Request, res: Response) => {
    const shortUrl = req.params.shortUrl;

    if (typeof shortUrl !== "string") {
      this.logger.warn("Invalid short URL parameter", {
        shortUrl,
        expectedType: "string",
      });
      return res.status(400).json({ error: "Wrong Short Url" });
    }

    const url = await this.urlService.getLongUrl(shortUrl);

    if (!url) {
      this.logger.warn("Short URL not found", { shortUrl });
      return res.status(404).json({ error: `Url ${shortUrl} not found` });
    }

    return res.status(302).redirect(url.long_url);
  };

  public createUrl = async (req: Request, res: Response) => {
    const [error, createUrlDto] = CreateUrlDto.create(req.body);
    if (error) {
      this.logger.warn("Validation failed for create URL", { error, body: req.body });
      return res.status(400).json({ error });
    }

    const url = await this.urlService.createShortUrl(createUrlDto!.long_url);
    return url
      ? res.status(201).json({
          originalUrl: url.long_url,
          shortUrl: `${envs.BASE_URL}/${url.short_url}`,
        })
      : res.status(500).json({
          error: "Something went wrong creating the url",
        });
  };

  public getStats = async (req: Request, res: Response) => {
    const stats = await this.urlService.getStats();
    return stats
      ? res.status(200).json(stats)
      : res.status(500).json({ error: "Something went wrong getting stats" });
  };
}
