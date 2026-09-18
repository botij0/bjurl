import { createHash, randomBytes } from "crypto";

import { encodeBase62 } from "../config/encode";
import { buildLogger } from "../config/logger";
import { envs } from "../config/envs";
import {
  LinkCodeConflictError,
  type ClaimResult,
  type LinkRecord,
  type LinkStore,
  type NewLink,
} from "../data/link-store";

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
  | { ok: true; url: LinkRecord }
  | { ok: false; reason: "taken" | "error" };

export type ResolveUrlResult =
  | { ok: true; url: LinkRecord }
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

const randomSuffix = () => randomBytes(2).toString("hex");

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max)}...` : value;

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
  private readonly store: LinkStore;
  private readonly newSuffix: () => string;

  constructor(
    store: LinkStore,
    newSuffix: () => string = randomSuffix,
  ) {
    this.logger = buildLogger("url.service.js");
    this.store = store;
    this.newSuffix = newSuffix;
  }

  public async getLongUrl(
    shortUrl: string,
    context: ClickContext = {},
  ): Promise<ResolveUrlResult> {
    try {
      const claimed = await this.claimByCode(shortUrl);

      if (!claimed.ok) {
        if (claimed.reason === "gone") {
          this.logger.warn("Short URL expired or reached its click limit", {
            shortUrl,
          });
        }

        return claimed;
      }

      this.recordClick(claimed.link.id, context);

      this.logger.log("Short URL resolved", {
        shortUrl,
        redirectTo: truncate(claimed.link.long_url, 80),
      });

      return { ok: true, url: claimed.link };
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
    const input: NewLink = {
      long_url: longUrl,
      expires_at: options.expiresAt,
      max_clicks: options.maxClicks,
      custom_alias: options.customAlias !== undefined,
    };

    const alias = options.customAlias;
    const candidates = alias
      ? () => [alias]
      : (id: bigint) => this.generatedCandidates(id);

    try {
      const created = await this.store.insertLink(input, candidates);

      this.logger.log("Short URL created", {
        shortUrl: created.short_url,
        longUrl: truncate(longUrl, 100),
        id: created.id,
      });

      return { ok: true, url: created };
    } catch (error) {
      if (error instanceof LinkCodeConflictError) {
        if (alias) {
          this.logger.warn("Short URL alias already in use", {
            customAlias: alias,
            error: `${error}`,
          });
          return { ok: false, reason: "taken" };
        }

        this.logger.error(
          `Every generated code was already in use: { params: ${longUrl}, error: ${error}}`,
        );
        return { ok: false, reason: "error" };
      }

      this.logger.error(
        `Error creating shortUrl: { params: ${longUrl}, error: ${error}}`,
      );
      return { ok: false, reason: "error" };
    }
  }

  public async getStats() {
    try {
      const stats = await this.store.totalStats();
      this.logger.log("Stats retrieved", {
        urls: stats.urls,
        clicks: stats.clicks,
      });
      return stats;
    } catch (error) {
      this.logger.error(`Error getting stats from database: ${error}`);
      return null;
    }
  }

  public async getLinkStats(shortUrl: string): Promise<LinkStats | null> {
    try {
      const url = await this.findLink(shortUrl);

      if (!url) return null;

      const clicks = await this.store.clicksFor(url.id);

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
        totalClicks: clicks.length,
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

  public async getStatsByShortUrls(
    shortUrls: string[],
  ): Promise<LinkSummary[] | null> {
    try {
      const urls = await this.store.findManyByCodes(shortUrls);

      if (urls.length === 0) return [];

      const counts = await this.store.clickCountsFor(urls.map((url) => url.id));
      const byLink = new Map(counts.map((entry) => [entry.url_id, entry.count]));

      return urls.map((url) => ({
        shortUrl: url.short_url ?? "",
        originalUrl: url.long_url,
        totalClicks: byLink.get(url.id) ?? 0,
        createdAt: url.created_at,
        expiresAt: url.expires_at,
        maxClicks: url.max_clicks,
      }));
    } catch (error) {
      this.logger.error(`Error getting batch stats: ${error}`);
      return null;
    }
  }

  public async isAliasAvailable(alias: string): Promise<boolean | null> {
    try {
      return !(await this.store.codeExists(alias));
    } catch (error) {
      this.logger.error(
        `Error checking alias availability: { params: ${alias}, error: ${error}}`,
      );
      return null;
    }
  }

  private async claimByCode(shortUrl: string): Promise<ClaimResult> {
    const now = new Date();
    const claimed = await this.store.claimRedirect(shortUrl, now);

    if (claimed.ok || claimed.reason !== "not_found") return claimed;

    const normalized = shortUrl.toLowerCase();
    if (normalized === shortUrl) return claimed;

    return this.store.claimRedirect(normalized, now);
  }

  private async findLink(shortUrl: string): Promise<LinkRecord | null> {
    const link = await this.store.findByCode(shortUrl);
    if (link) return link;

    const normalized = shortUrl.toLowerCase();
    if (normalized === shortUrl) return null;

    return this.store.findByCode(normalized);
  }

  private generatedCandidates(id: bigint): string[] {
    const code = encodeBase62(id);
    const suffixes = Array.from({ length: CODE_ATTEMPTS - 1 }, () =>
      this.newSuffix(),
    );

    return [code, ...suffixes.map((suffix) => `${code}${suffix}`)];
  }

  private recordClick(urlId: bigint, context: ClickContext) {
    void this.storeClick(urlId, context);
  }

  private async storeClick(urlId: bigint, context: ClickContext) {
    try {
      await this.store.recordClick({
        url_id: urlId,
        referrer: context.referrer?.slice(0, REFERRER_MAX_LENGTH),
        user_agent: context.userAgent?.slice(0, USER_AGENT_MAX_LENGTH),
        ip_hash: this.hashIp(context.ip),
        country: context.country?.slice(0, 2).toUpperCase(),
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
