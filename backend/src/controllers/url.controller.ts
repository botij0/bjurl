import type { Request, Response } from "express";

import { UrlService } from "../services/url.service";
import { CreateUrlDto } from "../data/dtos/create-url.dto";

export class UrlController {
  private urlService: UrlService;

  constructor() {
    this.urlService = new UrlService();
  }

  public getUrl = async (req: Request, res: Response) => {
    const shortUrl = req.params.shortUrl;

    if (typeof shortUrl !== "string")
      return res.status(400).json({ error: "Wrong Short Url" });

    const url = await this.urlService.getLongUrl(shortUrl);

    console.log(url?.long_url);

    return url
      ? res.status(302).redirect(url.long_url)
      : res.status(404).json({ error: `Url ${shortUrl} not found` });
  };

  public createUrl = async (req: Request, res: Response) => {
    const [error, createUrlDto] = CreateUrlDto.create(req.body);
    if (error) return res.status(400).json({ error });

    const url = await this.urlService.createShortUrl(createUrlDto!.long_url);
    return url
      ? res.status(201).json({
          originalUrl: url.long_url,
          shortUrl: url.short_url,
        })
      : res.status(500).json({
          error: "Something went wrong creating the url",
        });
  };
}
