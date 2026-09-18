import { createHash, randomBytes } from "crypto";

import { encodeBase62 } from "../config/encode";
import { buildLogger } from "../config/logger";
import { envs } from "../config/envs";
import {
  LinkCodeConflictError,
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
const REFERRER_MAX_LENGTH = 500;
const USER_AGENT_MAX_LENGTH = 500;

const randomSuffix = () => randomBytes(2).toString("hex");

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max)}...` : value;

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
      const claimed = await this.store.claimRedirect(shortUrl, new Date());

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
      const url = await this.store.findByCode(shortUrl);

      if (!url) return null;

      const aggregate = await this.store.linkStatsFor(url.id);

      const stats: LinkStats = {
        shortUrl: url.short_url ?? shortUrl,
        originalUrl: url.long_url,
        totalClicks: aggregate.totalClicks,
        uniqueClicks: aggregate.uniqueClicks,
        createdAt: url.created_at,
        expiresAt: url.expires_at,
        maxClicks: url.max_clicks,
        clicksByDay: aggregate.clicksByDay,
        topReferrers: aggregate.topReferrers,
        topDevices: aggregate.topDevices,
        topCountries: aggregate.topCountries,
      };

      this.logger.log("Link stats retrieved", {
        shortUrl,
        clicks: aggregate.totalClicks,
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
      return [];
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
