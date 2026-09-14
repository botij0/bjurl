import { UrlService } from "./url.service";
import { prisma } from "../data/postgres";
import { encodeBase62 } from "../config/encode";
import { buildLogger } from "../config/logger";

jest.mock("../data/postgres", () => ({
  prisma: {
    url: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    click: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("../config/encode", () => ({
  encodeBase62: jest.fn(),
}));

jest.mock("../config/logger", () => ({
  buildLogger: jest.fn(),
}));

const baseUrl = {
  id: 1n,
  long_url: "https://example.com",
  short_url: "abc123",
  counter: 0,
  created_at: new Date("2026-01-01T00:00:00Z"),
  expires_at: null,
  max_clicks: null,
  custom_alias: false,
};

describe("UrlService", () => {
  let service: UrlService;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    (buildLogger as jest.Mock).mockReturnValue(mockLogger);
    (prisma.click.create as jest.Mock).mockResolvedValue({});

    service = new UrlService();
  });

  describe("getLongUrl", () => {
    const context = {
      referrer: "https://google.com",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      ip: "10.0.0.1",
      country: "ES",
    };

    test("should return not_found when the code does not exist", async () => {
      (prisma.url.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getLongUrl("missing");

      expect(result).toEqual({ ok: false, reason: "not_found" });
      expect(prisma.url.updateMany).not.toHaveBeenCalled();
    });

    test("should increment the counter and return the url", async () => {
      (prisma.url.findUnique as jest.Mock).mockResolvedValue(baseUrl);
      (prisma.url.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.getLongUrl("abc123", context);

      expect(prisma.url.updateMany).toHaveBeenCalledWith({
        where: { id: baseUrl.id },
        data: { counter: { increment: 1 } },
      });
      expect(result).toEqual({
        ok: true,
        url: expect.objectContaining({ counter: 1, long_url: baseUrl.long_url }),
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Short URL resolved",
        expect.objectContaining({ shortUrl: "abc123" }),
      );
    });

    test("should store the click event with a hashed ip", async () => {
      (prisma.url.findUnique as jest.Mock).mockResolvedValue(baseUrl);
      (prisma.url.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.getLongUrl("abc123", context);

      expect(prisma.click.create).toHaveBeenCalledWith({
        data: {
          url_id: baseUrl.id,
          referrer: "https://google.com",
          user_agent: context.userAgent,
          ip_hash: expect.not.stringContaining("10.0.0.1"),
          country: "ES",
        },
      });
    });

    test("should add expiration condition when the url expires", async () => {
      const expiring = { ...baseUrl, expires_at: new Date("2026-01-02T00:00:00Z") };
      (prisma.url.findUnique as jest.Mock).mockResolvedValue(expiring);
      (prisma.url.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.getLongUrl("abc123");

      expect(prisma.url.updateMany).toHaveBeenCalledWith({
        where: { id: baseUrl.id, expires_at: { gt: expect.any(Date) } },
        data: { counter: { increment: 1 } },
      });
    });

    test("should add click limit condition when max_clicks is set", async () => {
      const limited = { ...baseUrl, max_clicks: 5 };
      (prisma.url.findUnique as jest.Mock).mockResolvedValue(limited);
      (prisma.url.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.getLongUrl("abc123");

      expect(prisma.url.updateMany).toHaveBeenCalledWith({
        where: { id: baseUrl.id, counter: { lt: 5 } },
        data: { counter: { increment: 1 } },
      });
    });

    test("should return gone when the link expired or hit its limit", async () => {
      (prisma.url.findUnique as jest.Mock).mockResolvedValue(baseUrl);
      (prisma.url.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await service.getLongUrl("abc123");

      expect(result).toEqual({ ok: false, reason: "gone" });
      expect(prisma.click.create).not.toHaveBeenCalled();
    });

    test("should not fail the redirect when click storage fails", async () => {
      (prisma.url.findUnique as jest.Mock).mockResolvedValue(baseUrl);
      (prisma.url.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.click.create as jest.Mock).mockRejectedValue(new Error("DB error"));
      const context = { ip: undefined, referrer: undefined };

      const result = await service.getLongUrl("abc123", context);

      await new Promise((resolve) => setImmediate(resolve));

      expect(result.ok).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error storing click event"),
      );
    });

    test("should return error if database throws", async () => {
      (prisma.url.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"));

      const result = await service.getLongUrl("fail");

      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toEqual({ ok: false, reason: "error" });
    });
  });

  describe("createShortUrl", () => {
    test("should create a url with a custom alias", async () => {
      (prisma.url.create as jest.Mock).mockResolvedValue({
        ...baseUrl,
        short_url: "promo",
        custom_alias: true,
      });

      const result = await service.createShortUrl("https://example.com", {
        customAlias: "promo",
      });

      expect(prisma.url.create).toHaveBeenCalledWith({
        data: {
          long_url: "https://example.com",
          short_url: "promo",
          custom_alias: true,
          expires_at: undefined,
          max_clicks: undefined,
        },
      });
      expect(result).toEqual({
        ok: true,
        url: expect.objectContaining({ short_url: "promo", custom_alias: true }),
      });
    });

    test("should return alias_taken when the alias already exists", async () => {
      (prisma.url.create as jest.Mock).mockRejectedValue({ code: "P2002" });

      const result = await service.createShortUrl("https://example.com", {
        customAlias: "promo",
      });

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(result).toEqual({ ok: false, reason: "alias_taken" });
    });

    test("should create a url with a generated base62 code", async () => {
      const created = { ...baseUrl, short_url: null };
      const updated = { ...baseUrl, short_url: "xyz789" };
      (encodeBase62 as jest.Mock).mockReturnValue("xyz789");

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback({
          url: {
            create: jest.fn().mockResolvedValue(created),
            update: jest.fn().mockResolvedValue(updated),
          },
        }),
      );

      const result = await service.createShortUrl("https://example.com");

      expect(encodeBase62).toHaveBeenCalledWith(created.id);
      expect(result).toEqual({ ok: true, url: updated });
    });

    test("should retry with a suffix when the generated code collides", async () => {
      const updated = { ...baseUrl, short_url: "abc1234f2a" };
      (encodeBase62 as jest.Mock).mockReturnValue("abc123");

      (prisma.$transaction as jest.Mock)
        .mockRejectedValueOnce({ code: "P2002" })
        .mockImplementationOnce(async (callback: any) =>
          callback({
            url: {
              create: jest.fn().mockResolvedValue({ ...baseUrl, short_url: null }),
              update: jest.fn().mockResolvedValue(updated),
            },
          }),
        );

      const result = await service.createShortUrl("https://example.com");

      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ ok: true, url: updated });
    });

    test("should return error when all generated codes collide", async () => {
      (encodeBase62 as jest.Mock).mockReturnValue("abc123");
      (prisma.$transaction as jest.Mock).mockRejectedValue({ code: "P2002" });

      const result = await service.createShortUrl("https://example.com");

      expect(result).toEqual({ ok: false, reason: "error" });
    });

    test("should return error if transaction fails", async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        new Error("Transaction failed"),
      );

      const result = await service.createShortUrl("https://example.com");

      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toEqual({ ok: false, reason: "error" });
    });

    test("should persist expiration and max clicks", async () => {
      const expiresAt = new Date("2027-01-01T00:00:00Z");
      (prisma.url.create as jest.Mock).mockResolvedValue({
        ...baseUrl,
        expires_at: expiresAt,
        max_clicks: 1,
      });

      await service.createShortUrl("https://example.com", {
        customAlias: "once",
        expiresAt,
        maxClicks: 1,
      });

      expect(prisma.url.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expires_at: expiresAt,
          max_clicks: 1,
        }),
      });
    });
  });

  describe("getStats", () => {
    test("should return stats", async () => {
      (prisma.url.count as jest.Mock).mockResolvedValue(5);
      (prisma.url.aggregate as jest.Mock).mockResolvedValue({
        _sum: { counter: 20 },
      });

      const result = await service.getStats();

      expect(prisma.url.count).toHaveBeenCalled();
      expect(prisma.url.aggregate).toHaveBeenCalledWith({
        _sum: { counter: true },
      });
      expect(result).toEqual({ urls: 5, clicks: 20 });
    });

    test("should return null if error occurs", async () => {
      (prisma.url.count as jest.Mock).mockRejectedValue(new Error("DB error"));

      const result = await service.getStats();

      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("getLinkStats", () => {
    const clicks = [
      {
        referrer: null,
        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile",
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
        user_agent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        ip_hash: "hash-1",
        country: null,
        clicked_at: new Date("2026-09-11T12:00:00Z"),
      },
    ];

    test("should return null when the url does not exist", async () => {
      (prisma.url.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getLinkStats("missing");

      expect(result).toBeNull();
    });

    test("should aggregate clicks by day, referrer, device and country", async () => {
      (prisma.url.findUnique as jest.Mock).mockResolvedValue({
        ...baseUrl,
        counter: 3,
      });
      (prisma.click.findMany as jest.Mock).mockResolvedValue(clicks);

      const result = await service.getLinkStats("abc123");

      expect(result).not.toBeNull();
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

    test("should return null if error occurs", async () => {
      (prisma.url.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"));

      const result = await service.getLinkStats("abc123");

      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("getStatsByShortUrls", () => {
    test("should return summaries for the given codes", async () => {
      (prisma.url.findMany as jest.Mock).mockResolvedValue([
        {
          long_url: "https://example.com",
          short_url: "abc123",
          counter: 4,
          created_at: baseUrl.created_at,
          expires_at: null,
          max_clicks: null,
        },
      ]);

      const result = await service.getStatsByShortUrls(["abc123"]);

      expect(prisma.url.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { short_url: { in: ["abc123"] } } }),
      );
      expect(result).toEqual([
        {
          shortUrl: "abc123",
          originalUrl: "https://example.com",
          totalClicks: 4,
          createdAt: baseUrl.created_at,
          expiresAt: null,
          maxClicks: null,
        },
      ]);
    });

    test("should return an empty array if error occurs", async () => {
      (prisma.url.findMany as jest.Mock).mockRejectedValue(new Error("DB error"));

      const result = await service.getStatsByShortUrls(["abc123"]);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe("isAliasAvailable", () => {
    test("should return true when the alias is free", async () => {
      (prisma.url.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.isAliasAvailable("promo");

      expect(result).toBe(true);
    });

    test("should return false when the alias is taken", async () => {
      (prisma.url.findUnique as jest.Mock).mockResolvedValue({ id: 1n });

      const result = await service.isAliasAvailable("promo");

      expect(result).toBe(false);
    });

    test("should return null if error occurs", async () => {
      (prisma.url.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"));

      const result = await service.isAliasAvailable("promo");

      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});
