import { createHash } from "crypto";

import { buildLogger } from "../config/logger";
import { envs } from "../config/envs";
import { InMemoryLinkStore } from "../data/in-memory-link-store";
import { UrlService } from "./url.service";

jest.mock("../config/logger", () => ({
  buildLogger: jest.fn(),
}));

const FIXED_SUFFIX = "dead";

const clickContext = {
  referrer: "https://google.com",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  ip: "10.0.0.1",
  country: "ES",
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("UrlService", () => {
  let store: InMemoryLinkStore;
  let service: UrlService;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock };

  const seed = (
    code: string,
    overrides: { long_url?: string; expires_at?: Date; max_clicks?: number } = {},
  ) =>
    store.insertLink(
      {
        long_url: overrides.long_url ?? "https://taken.example",
        expires_at: overrides.expires_at,
        max_clicks: overrides.max_clicks,
      },
      () => [code],
    );

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    (buildLogger as jest.Mock).mockReturnValue(mockLogger);

    store = new InMemoryLinkStore();
    service = new UrlService(store, () => FIXED_SUFFIX);
  });

  describe("getLongUrl", () => {
    test("should report a missing code as not found", async () => {
      expect(await service.getLongUrl("missing")).toEqual({
        ok: false,
        reason: "not_found",
      });
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    test("should count the click and hand back the link", async () => {
      await seed("abc123");

      const result = await service.getLongUrl("abc123", clickContext);

      expect(result).toEqual({
        ok: true,
        url: expect.objectContaining({
          short_url: "abc123",
          long_url: "https://taken.example",
          counter: 1,
        }),
      });
      expect(await store.findByCode("abc123")).toEqual(
        expect.objectContaining({ counter: 1 }),
      );
    });

    test("should report an expired link as gone", async () => {
      await seed("abc123", { expires_at: new Date(Date.now() - 60_000) });

      expect(await service.getLongUrl("abc123")).toEqual({
        ok: false,
        reason: "gone",
      });
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    test("should let a one-time link through once and then report it gone", async () => {
      await seed("abc123", { max_clicks: 1 });

      expect((await service.getLongUrl("abc123")).ok).toBe(true);
      expect(await service.getLongUrl("abc123")).toEqual({
        ok: false,
        reason: "gone",
      });
    });

    test("should store the click without the raw ip", async () => {
      const link = await seed("abc123");

      await service.getLongUrl("abc123", clickContext);
      await flush();

      expect(await store.clicksFor(link.id)).toEqual([
        expect.objectContaining({
          referrer: "https://google.com",
          user_agent: clickContext.userAgent,
          country: "ES",
          ip_hash: expect.not.stringContaining("10.0.0.1"),
        }),
      ]);
    });

    test("should truncate the referrer and user agent to five hundred characters", async () => {
      const link = await seed("abc123");
      const longReferrer = `https://ref.example/${"r".repeat(600)}`;
      const longUserAgent = "u".repeat(600);

      await service.getLongUrl("abc123", {
        referrer: longReferrer,
        userAgent: longUserAgent,
      });
      await flush();

      const click = (await store.clicksFor(link.id))[0]!;

      expect(click.referrer).toBe(longReferrer.slice(0, 500));
      expect(click.referrer).toHaveLength(500);
      expect(click.user_agent).toBe(longUserAgent.slice(0, 500));
      expect(click.user_agent).toHaveLength(500);
    });

    test("should normalize the country to an upper-case two-letter code", async () => {
      const link = await seed("abc123");

      await service.getLongUrl("abc123", { country: "es" });
      await flush();

      const click = (await store.clicksFor(link.id))[0]!;
      expect(click.country).toBe("ES");
    });

    test("should store a salted hash of the ip, never the ip itself", async () => {
      const link = await seed("abc123");
      const salted = createHash("sha256")
        .update(`${envs.IP_HASH_SALT}:10.0.0.1`)
        .digest("hex");
      const unsalted = createHash("sha256").update("10.0.0.1").digest("hex");

      await service.getLongUrl("abc123", { ip: "10.0.0.1" });
      await flush();

      const click = (await store.clicksFor(link.id))[0]!;

      expect(click.ip_hash).toBe(salted);
      expect(click.ip_hash).not.toBe(unsalted);
      expect(click.ip_hash).not.toContain("10.0.0.1");
    });

    test("should not fail the redirect when click storage fails", async () => {
      await seed("abc123");
      jest.spyOn(store, "recordClick").mockRejectedValue(new Error("DB error"));

      const result = await service.getLongUrl("abc123", {
        ip: undefined,
        referrer: undefined,
      });
      await flush();

      expect(result.ok).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error storing click event"),
      );
    });

    test("should report error when the store fails", async () => {
      jest.spyOn(store, "claimRedirect").mockRejectedValue(new Error("DB error"));

      expect(await service.getLongUrl("abc123")).toEqual({
        ok: false,
        reason: "error",
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("createShortUrl", () => {
    test("should create a link with a custom alias", async () => {
      const result = await service.createShortUrl("https://example.com", {
        customAlias: "promo",
      });

      expect(result).toEqual({
        ok: true,
        url: expect.objectContaining({
          short_url: "promo",
          custom_alias: true,
          counter: 0,
        }),
      });
    });

    test("should report taken when the alias is already in use", async () => {
      await seed("promo");

      const result = await service.createShortUrl("https://example.com", {
        customAlias: "promo",
      });

      expect(result).toEqual({ ok: false, reason: "taken" });
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    test("should derive the generated code from the row id", async () => {
      const result = await service.createShortUrl("https://example.com");

      expect(result).toEqual({
        ok: true,
        url: expect.objectContaining({ short_url: "b", custom_alias: false }),
      });
    });

    test("should fall back to a suffixed code when the generated one is in use", async () => {
      await seed("c");

      const result = await service.createShortUrl("https://example.com");

      expect(result).toEqual({
        ok: true,
        url: expect.objectContaining({ short_url: `c${FIXED_SUFFIX}` }),
      });
    });

    test("should report error, not taken, when every generated code is in use", async () => {
      await seed("d");
      await seed(`d${FIXED_SUFFIX}`);

      const result = await service.createShortUrl("https://example.com");

      expect(result).toEqual({ ok: false, reason: "error" });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test("should persist expiration and max clicks", async () => {
      const expiresAt = new Date("2027-01-01T00:00:00Z");

      const result = await service.createShortUrl("https://example.com", {
        customAlias: "once",
        expiresAt,
        maxClicks: 1,
      });

      expect(result).toEqual({
        ok: true,
        url: expect.objectContaining({ expires_at: expiresAt, max_clicks: 1 }),
      });
    });

    test("should report error when the store fails", async () => {
      jest.spyOn(store, "insertLink").mockRejectedValue(new Error("DB error"));

      expect(await service.createShortUrl("https://example.com")).toEqual({
        ok: false,
        reason: "error",
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("getStats", () => {
    test("should total the links and their logged clicks", async () => {
      await seed("one");
      await seed("two");
      await service.getLongUrl("one");
      await service.getLongUrl("two");
      await service.getLongUrl("two");
      await flush();

      expect(await service.getStats()).toEqual({ urls: 2, clicks: 3 });
    });

    test("should return null if error occurs", async () => {
      jest.spyOn(store, "totalStats").mockRejectedValue(new Error("DB error"));

      expect(await service.getStats()).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("getLinkStats", () => {
    test("should return null when the link does not exist", async () => {
      expect(await service.getLinkStats("missing")).toBeNull();
    });

    test("should aggregate clicks by day, referrer, device and country", async () => {
      const link = await seed("abc123");

      const clicks = [
        {
          referrer: null,
          user_agent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile",
          ip_hash: "hash-1",
          country: "US",
          clicked_at: new Date("2026-09-10T10:00:00Z"),
        },
        {
          referrer: "https://google.com",
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          ip_hash: "hash-2",
          country: "ES",
          clicked_at: new Date("2026-09-11T10:00:00Z"),
        },
        {
          referrer: "https://google.com",
          user_agent:
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
          ip_hash: "hash-1",
          country: null,
          clicked_at: new Date("2026-09-11T12:00:00Z"),
        },
      ];

      for (const click of clicks) {
        store.seedClick({ url_id: link.id, ...click });
      }

      const result = await service.getLinkStats("abc123");

      expect(result).not.toBeNull();
      expect(result!.shortUrl).toBe("abc123");
      expect(result!.originalUrl).toBe("https://taken.example");
      expect(result!.totalClicks).toBe(3);
      expect(result!.uniqueClicks).toBe(2);
      expect(result!.clicksByDay).toEqual([
        { date: "2026-09-10", count: 1 },
        { date: "2026-09-11", count: 2 },
      ]);
      expect(result!.topReferrers[0]).toEqual({
        referrer: "https://google.com",
        count: 2,
      });
      expect(result!.topReferrers).toContainEqual({ referrer: "direct", count: 1 });
      expect(result!.topDevices).toEqual(
        expect.arrayContaining([
          { device: "mobile", count: 1 },
          { device: "desktop", count: 1 },
          { device: "bot", count: 1 },
        ]),
      );
      expect(result!.topCountries).toEqual(
        expect.arrayContaining([
          { country: "US", count: 1 },
          { country: "ES", count: 1 },
        ]),
      );
    });

    test("should classify tablet user agents and unknown devices", async () => {
      const link = await seed("abc123");

      store.seedClick({
        url_id: link.id,
        referrer: null,
        user_agent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
        ip_hash: null,
        country: null,
        clicked_at: new Date("2026-09-10T10:00:00Z"),
      });
      store.seedClick({
        url_id: link.id,
        referrer: null,
        user_agent: null,
        ip_hash: null,
        country: null,
        clicked_at: new Date("2026-09-11T10:00:00Z"),
      });

      const result = await service.getLinkStats("abc123");

      expect(result!.topDevices).toEqual(
        expect.arrayContaining([
          { device: "tablet", count: 1 },
          { device: "unknown", count: 1 },
        ]),
      );
    });

    test("should count logged clicks, not admissions", async () => {
      await seed("abc123");

      await store.claimRedirect("abc123", new Date());
      await store.claimRedirect("abc123", new Date());

      const result = await service.getLinkStats("abc123");

      expect(result!.totalClicks).toBe(0);
      expect(result!.clicksByDay).toEqual([]);
    });

    test("should return null if error occurs", async () => {
      jest.spyOn(store, "findByCode").mockRejectedValue(new Error("DB error"));

      expect(await service.getLinkStats("abc123")).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("getStatsByShortUrls", () => {
    test("should summarise only the codes it finds", async () => {
      const one = await seed("one");
      await seed("two");
      await service.getLongUrl("one");

      expect(await service.getStatsByShortUrls(["one", "missing"])).toEqual([
        {
          shortUrl: "one",
          originalUrl: "https://taken.example",
          totalClicks: 1,
          createdAt: one.created_at,
          expiresAt: null,
          maxClicks: null,
        },
      ]);
    });

    test("should summarise logged clicks, not admissions", async () => {
      await seed("one");
      jest.spyOn(store, "recordClick").mockRejectedValue(new Error("DB error"));

      await service.getLongUrl("one");
      await service.getLongUrl("one");
      await flush();

      expect(await service.getStatsByShortUrls(["one"])).toEqual([
        expect.objectContaining({ shortUrl: "one", totalClicks: 0 }),
      ]);
      expect(await store.findByCode("one")).toEqual(
        expect.objectContaining({ counter: 2 }),
      );
    });

    test("should return an empty array if error occurs", async () => {
      jest
        .spyOn(store, "findManyByCodes")
        .mockRejectedValue(new Error("DB error"));

      expect(await service.getStatsByShortUrls(["abc"])).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("isAliasAvailable", () => {
    test("should return true when the alias is free", async () => {
      expect(await service.isAliasAvailable("promo")).toBe(true);
    });

    test("should return false when the alias is taken", async () => {
      await seed("promo");

      expect(await service.isAliasAvailable("promo")).toBe(false);
    });

    test("should return null if error occurs", async () => {
      jest.spyOn(store, "codeExists").mockRejectedValue(new Error("DB error"));

      expect(await service.isAliasAvailable("promo")).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
