import type { Request, Response } from "express";

import type { ClickContext, UrlService } from "../services/url.service";
import { CreateUrlDto } from "../data/dtos/create-url.dto";
import { buildLogger } from "../config/logger";
import { envs } from "../config/envs";
import { getAliasRejection, getAliasVerdict } from "../config/aliases";

const MAX_BATCH_SIZE = 100;

export class UrlController {
  private readonly logger = buildLogger("url.controller");

  constructor(private readonly urlService: UrlService) {}

  public getUrl = async (req: Request, res: Response) => {
    const shortUrl = req.params.shortUrl;

    if (typeof shortUrl !== "string") {
      this.logger.warn("Invalid short URL parameter", {
        shortUrl,
        expectedType: "string",
      });
      return res.status(400).json({ error: "Wrong Short Url" });
    }

    const result = await this.urlService.getLongUrl(
      shortUrl,
      this.getClickContext(req),
    );

    if (!result.ok) {
      if (result.reason === "not_found") {
        this.logger.warn("Short URL not found", { shortUrl });
        return res.status(404).json({ error: `Url ${shortUrl} not found` });
      }

      if (result.reason === "gone") {
        return res.status(410).json({
          error: "This link has expired or reached its click limit",
        });
      }

      return res
        .status(500)
        .json({ error: "Something went wrong resolving the url" });
    }

    return res.status(302).redirect(result.url.long_url);
  };

  public createUrl = async (req: Request, res: Response) => {
    const [error, createUrlDto] = CreateUrlDto.create(req.body ?? {});
    if (error) {
      this.logger.warn("Validation failed for create URL", { error, body: req.body });
      return res.status(400).json({ error });
    }

    if (createUrlDto!.custom_alias) {
      const verdict = getAliasVerdict(createUrlDto!.custom_alias, false);
      if (verdict !== "free") {
        this.logger.warn("Alias refused", {
          customAlias: createUrlDto!.custom_alias,
          verdict,
        });
        return res.status(400).json({ reason: verdict });
      }
    }

    const result = await this.urlService.createShortUrl(createUrlDto!.long_url, {
      customAlias: createUrlDto!.custom_alias,
      expiresAt: createUrlDto!.expires_at,
      maxClicks: createUrlDto!.max_clicks,
    });

    if (!result.ok) {
      if (result.reason === "taken") {
        return res.status(409).json({ reason: "taken" });
      }

      return res.status(500).json({
        error: "Something went wrong creating the url",
      });
    }

    return res.status(201).json({
      originalUrl: result.url.long_url,
      shortUrl: `${envs.BASE_URL}/${result.url.short_url}`,
      expiresAt: result.url.expires_at,
      maxClicks: result.url.max_clicks,
      customAlias: result.url.custom_alias,
    });
  };

  public getStats = async (req: Request, res: Response) => {
    const stats = await this.urlService.getStats();
    return stats
      ? res.status(200).json(stats)
      : res.status(500).json({ error: "Something went wrong getting stats" });
  };

  public getLinkStats = async (req: Request, res: Response) => {
    const shortUrl = req.params.shortUrl;

    if (typeof shortUrl !== "string") {
      this.logger.warn("Invalid short URL parameter", { shortUrl });
      return res.status(400).json({ error: "Wrong Short Url" });
    }

    const stats = await this.urlService.getLinkStats(shortUrl);

    if (!stats) {
      this.logger.warn("Short URL not found for stats", { shortUrl });
      return res.status(404).json({ error: `Url ${shortUrl} not found` });
    }

    return res.status(200).json(stats);
  };

  public getBatchStats = async (req: Request, res: Response) => {
    const shortUrls = req.body?.shortUrls;

    if (
      !Array.isArray(shortUrls) ||
      shortUrls.length === 0 ||
      shortUrls.length > MAX_BATCH_SIZE ||
      shortUrls.some((shortUrl) => typeof shortUrl !== "string")
    ) {
      return res.status(400).json({
        error: `shortUrls must be an array of 1 to ${MAX_BATCH_SIZE} strings`,
      });
    }

    const links = await this.urlService.getStatsByShortUrls(shortUrls);
    return res.status(200).json({ links });
  };

  public checkAlias = async (req: Request, res: Response) => {
    const alias = req.params.alias;

    if (typeof alias !== "string") {
      return res.status(400).json({ error: "Wrong alias" });
    }

    const rejection = getAliasRejection(alias);
    const available = rejection ? false : await this.urlService.isAliasAvailable(alias);

    if (available === null) {
      return res
        .status(500)
        .json({ error: "Something went wrong checking the alias" });
    }

    const verdict = getAliasVerdict(alias, !available);

    return res.status(200).json({
      available: verdict === "free",
      reason: verdict === "free" ? null : verdict,
    });
  };

  private getClickContext(req: Request): ClickContext {
    return {
      referrer: req.get("referer") ?? undefined,
      userAgent: req.get("user-agent") ?? undefined,
      ip: req.ip ?? undefined,
      country: req.get("cf-ipcountry") ?? undefined,
    };
  }
}
