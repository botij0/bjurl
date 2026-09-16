import { createHash, randomBytes } from "crypto";

import { encodeBase62 } from "../config/encode";
import { prisma } from "../data/postgres";
import { buildLogger } from "../config/logger";
import { envs } from "../config/envs";

export interface UrlRecord {
  id: bigint;
  long_url: string;
  short_url: string | null;
  counter: number;
  created_at: Date;
  expires_at: Date | null;
  max_clicks: number | null;
  custom_alias: boolean;
}

export interface CreateShortUrlOptions {
  customAlias?: string;
  expiresAt?: Date;
  maxClicks?: number;
}

export interface ClickContext {
  referrer?: string;
  userAgent?: string;
  ip?: string;
  country?: string;
}

export type CreateShortUrlResult =
  | { ok: true; url: UrlRecord }
  | { ok: false; reason: "taken" | "error" };

export type ResolveUrlResult =
  | { ok: true; url: UrlRecord }
  | { ok: false; reason: "not_found" | "gone" | "error" };

export interface LinkStats {
  shortUrl: string;
  originalUrl: string;
  totalClicks: number;
  uniqueClicks: number;
  createdAt: Date;
  expiresAt: Date | null;
  maxClicks: number | null;
  clicksByDay: { date: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  topDevices: { device: string; count: number }[];
  topCountries: { country: string; count: number }[];
}

export interface LinkSummary {
  shortUrl: string;
  originalUrl: string;
  totalClicks: number;
  createdAt: Date;
  expiresAt: Date | null;
  maxClicks: number | null;
}

const CODE_ATTEMPTS = 3;
const TOP_ITEMS = 5;
const REFERRER_MAX_LENGTH = 500;
const USER_AGENT_MAX_LENGTH = 500;

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: unknown }).code === "P2002";

const randomSuffix = () => randomBytes(2).toString("hex");

const classifyDevice = (userAgent?: string | null): string => {
  if (!userAgent) return "unknown";

  const ua = userAgent.toLowerCase();
  if (/bot|crawl|spider|slurp|facebookexternalhit|preview/.test(ua)) return "bot";
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod/.test(ua)) return "mobile";
  return "desktop";
};

const topEntries = (counts: Map<string, number>) =>
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP_ITEMS);

export class UrlService {
  protected readonly logger;

  constructor() {
    this.logger = buildLogger("url.service.js");
  }

  public async getLongUrl(
    shortUrl: string,
    context: ClickContext = {},
  ): Promise<ResolveUrlResult> {
    try {
      const url = await prisma.url.findUnique({
        where: { short_url: shortUrl },
      });

      if (!url) return { ok: false, reason: "not_found" };

      const where: {
        id: bigint;
        expires_at?: { gt: Date };
        counter?: { lt: number };
      } = { id: url.id };

      if (url.expires_at) where.expires_at = { gt: new Date() };
      if (url.max_clicks !== null) where.counter = { lt: url.max_clicks };

      const updated = await prisma.url.updateMany({
        where,
        data: { counter: { increment: 1 } },
      });

      if (updated.count === 0) {
        this.logger.warn("Short URL expired or reached its click limit", {
          shortUrl,
        });
        return { ok: false, reason: "gone" };
      }

      this.recordClick(url.id, context);

      this.logger.log("Short URL resolved", {
        shortUrl,
        redirectTo:
          url.long_url.length > 80 ? `${url.long_url.slice(0, 80)}...` : url.long_url,
      });

      return { ok: true, url: { ...url, counter: url.counter + 1 } };
    } catch (error) {
      this.logger.error(
        `Error getting a long url from Database: { params: ${shortUrl}, error: ${error}}`,
      );
      return { ok: false, reason: "error" };
    }
  }

  public async createShortUrl(
    longUrl: string,
    options: CreateShortUrlOptions = {},
  ): Promise<CreateShortUrlResult> {
    try {
      if (options.customAlias) {
        const created = await prisma.url.create({
          data: {
            long_url: longUrl,
            short_url: options.customAlias,
            custom_alias: true,
            expires_at: options.expiresAt,
            max_clicks: options.maxClicks,
          },
        });

        this.logger.log("Short URL created", {
          shortUrl: created.short_url,
          longUrl: longUrl.length > 100 ? `${longUrl.slice(0, 100)}...` : longUrl,
          id: created.id,
        });

        return { ok: true, url: created };
      }

      const created = await this.createWithGeneratedCode(longUrl, options);

      this.logger.log("Short URL created", {
        shortUrl: created.short_url,
        longUrl: longUrl.length > 100 ? `${longUrl.slice(0, 100)}...` : longUrl,
        id: created.id,
      });

      return { ok: true, url: created };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        this.logger.warn("Short URL alias already in use", {
          customAlias: options.customAlias,
          error: `${error}`,
        });
        return { ok: false, reason: "taken" };
      }

      this.logger.error(
        `Error creating shortUrl: { params: ${longUrl}, error: ${error}}`,
      );
      return { ok: false, reason: "error" };
    }
  }

  public async getStats() {
    try {
      const totalUrls = await prisma.url.count();
      const totalClicks = await prisma.url.aggregate({
        _sum: {
          counter: true,
        },
      });

      const clicks = totalClicks._sum.counter || 0;
      this.logger.log("Stats retrieved", { urls: totalUrls, clicks });
      return {
        urls: totalUrls,
        clicks,
      };
    } catch (error) {
      this.logger.error(`Error getting stats from database: ${error}`);
      return null;
    }
  }

  public async getLinkStats(shortUrl: string): Promise<LinkStats | null> {
    try {
      const url = await prisma.url.findUnique({
        where: { short_url: shortUrl },
      });

      if (!url) return null;

      const clicks = await prisma.click.findMany({
        where: { url_id: url.id },
        select: {
          referrer: true,
          user_agent: true,
          ip_hash: true,
          country: true,
          clicked_at: true,
        },
      });

      const byDay = new Map<string, number>();
      const byReferrer = new Map<string, number>();
      const byDevice = new Map<string, number>();
      const byCountry = new Map<string, number>();
      const uniqueVisitors = new Set<string>();

      for (const click of clicks) {
        const day = click.clicked_at.toISOString().slice(0, 10);
        byDay.set(day, (byDay.get(day) ?? 0) + 1);

        const referrer = click.referrer?.trim() || "direct";
        byReferrer.set(referrer, (byReferrer.get(referrer) ?? 0) + 1);

        const device = classifyDevice(click.user_agent);
        byDevice.set(device, (byDevice.get(device) ?? 0) + 1);

        if (click.country) {
          byCountry.set(click.country, (byCountry.get(click.country) ?? 0) + 1);
        }

        if (click.ip_hash) uniqueVisitors.add(click.ip_hash);
      }

      const clicksByDay = [...byDay.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count }));

      const stats: LinkStats = {
        shortUrl: url.short_url ?? shortUrl,
        originalUrl: url.long_url,
        totalClicks: url.counter,
        uniqueClicks: uniqueVisitors.size,
        createdAt: url.created_at,
        expiresAt: url.expires_at,
        maxClicks: url.max_clicks,
        clicksByDay,
        topReferrers: topEntries(byReferrer).map(([referrer, count]) => ({
          referrer,
          count,
        })),
        topDevices: topEntries(byDevice).map(([device, count]) => ({
          device,
          count,
        })),
        topCountries: topEntries(byCountry).map(([country, count]) => ({
          country,
          count,
        })),
      };

      this.logger.log("Link stats retrieved", {
        shortUrl,
        clicks: clicks.length,
      });

      return stats;
    } catch (error) {
      this.logger.error(
        `Error getting link stats: { params: ${shortUrl}, error: ${error}}`,
      );
      return null;
    }
  }

  public async getStatsByShortUrls(shortUrls: string[]): Promise<LinkSummary[]> {
    try {
      const urls = await prisma.url.findMany({
        where: { short_url: { in: shortUrls } },
        select: {
          long_url: true,
          short_url: true,
          counter: true,
          created_at: true,
          expires_at: true,
          max_clicks: true,
        },
      });

      return urls.map((url) => ({
        shortUrl: url.short_url ?? "",
        originalUrl: url.long_url,
        totalClicks: url.counter,
        createdAt: url.created_at,
        expiresAt: url.expires_at,
        maxClicks: url.max_clicks,
      }));
    } catch (error) {
      this.logger.error(`Error getting batch stats: ${error}`);
      return [];
    }
  }

  public async isAliasAvailable(alias: string): Promise<boolean | null> {
    try {
      const existing = await prisma.url.findUnique({
        where: { short_url: alias },
        select: { id: true },
      });

      return !existing;
    } catch (error) {
      this.logger.error(
        `Error checking alias availability: { params: ${alias}, error: ${error}}`,
      );
      return null;
    }
  }

  private async createWithGeneratedCode(
    longUrl: string,
    options: CreateShortUrlOptions,
  ): Promise<UrlRecord> {
    let lastError: unknown;

    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          const record = await tx.url.create({
            data: {
              long_url: longUrl,
              expires_at: options.expiresAt,
              max_clicks: options.maxClicks,
            },
          });

          const code = encodeBase62(record.id);
          const candidate = attempt === 0 ? code : `${code}${randomSuffix()}`;

          return await tx.url.update({
            where: { id: record.id },
            data: { short_url: candidate },
          });
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
        lastError = error;
      }
    }

    throw new Error(`Could not generate a unique short code: ${lastError}`);
  }

  private recordClick(urlId: bigint, context: ClickContext) {
    void this.storeClick(urlId, context);
  }

  private async storeClick(urlId: bigint, context: ClickContext) {
    try {
      await prisma.click.create({
        data: {
          url_id: urlId,
          referrer: context.referrer?.slice(0, REFERRER_MAX_LENGTH),
          user_agent: context.userAgent?.slice(0, USER_AGENT_MAX_LENGTH),
          ip_hash: this.hashIp(context.ip),
          country: context.country?.slice(0, 2).toUpperCase(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Error storing click event: { params: ${urlId}, error: ${error}}`,
      );
    }
  }

  private hashIp(ip?: string): string | undefined {
    if (!ip) return undefined;
    return createHash("sha256").update(`${envs.IP_HASH_SALT}:${ip}`).digest("hex");
  }
}
