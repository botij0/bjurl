import type { UrlService } from "../services/url.service";
import { UrlController } from "./url.controller";
import { CreateUrlDto } from "../data/dtos/create-url.dto";
import { buildLogger } from "../config/logger";

jest.mock("../data/dtos/create-url.dto");
jest.mock("../config/logger");

describe("UrlController", () => {
  let controller: UrlController;
  let mockService: jest.Mocked<UrlService>;
  let mockLogger: {
    warn: jest.Mock;
    log: jest.Mock;
    error: jest.Mock;
  };

  const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockRequest = (overrides: Record<string, unknown> = {}) => {
    const req: any = {
      params: {},
      body: {},
      ip: "10.0.0.1",
      get: jest.fn().mockReturnValue(undefined),
      ...overrides,
    };
    return req;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      warn: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
    };

    (buildLogger as jest.Mock).mockReturnValue(mockLogger);

    mockService = {
      getLongUrl: jest.fn(),
      createShortUrl: jest.fn(),
      getStats: jest.fn(),
      getLinkStats: jest.fn(),
      getStatsByShortUrls: jest.fn(),
      isAliasAvailable: jest.fn(),
    } as unknown as jest.Mocked<UrlService>;

    controller = new UrlController(mockService);
  });

  describe("getUrl", () => {
    test("should return 400 if shortUrl is not a string", async () => {
      const req = mockRequest({ params: { shortUrl: 123 } });
      const res = mockResponse();

      await controller.getUrl(req, res);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Invalid short URL parameter",
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Wrong Short Url" });
    });

    test("should return 404 if url not found", async () => {
      const req = mockRequest({ params: { shortUrl: "abc" } });
      const res = mockResponse();

      mockService.getLongUrl.mockResolvedValue({ ok: false, reason: "not_found" });

      await controller.getUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Url abc not found" });
    });

    test("should return 410 if the url is expired or consumed", async () => {
      const req = mockRequest({ params: { shortUrl: "abc" } });
      const res = mockResponse();

      mockService.getLongUrl.mockResolvedValue({ ok: false, reason: "gone" });

      await controller.getUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(410);
      expect(res.json).toHaveBeenCalledWith({
        error: "This link has expired or reached its click limit",
      });
    });

    test("should return 500 if the service fails", async () => {
      const req = mockRequest({ params: { shortUrl: "abc" } });
      const res = mockResponse();

      mockService.getLongUrl.mockResolvedValue({ ok: false, reason: "error" });

      await controller.getUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test("should redirect if url exists", async () => {
      const req = mockRequest({ params: { shortUrl: "abc" } });
      const res = mockResponse();

      mockService.getLongUrl.mockResolvedValue({
        ok: true,
        url: {
          id: 1n,
          long_url: "https://example.com",
          short_url: "abc",
          counter: 1,
          created_at: new Date(),
          expires_at: null,
          max_clicks: null,
          custom_alias: false,
        },
      });

      await controller.getUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(302);
      expect(res.redirect).toHaveBeenCalledWith("https://example.com");
    });

    test("should forward click context from the request", async () => {
      const get = jest.fn((header: string) => {
        if (header === "referer") return "https://google.com";
        if (header === "user-agent") return "jest-agent";
        if (header === "cf-ipcountry") return "ES";
        return undefined;
      });
      const req = mockRequest({ params: { shortUrl: "abc" }, get });
      const res = mockResponse();

      mockService.getLongUrl.mockResolvedValue({ ok: false, reason: "not_found" });

      await controller.getUrl(req, res);

      expect(mockService.getLongUrl).toHaveBeenCalledWith("abc", {
        referrer: "https://google.com",
        userAgent: "jest-agent",
        ip: "10.0.0.1",
        country: "ES",
      });
    });
  });

  describe("createUrl", () => {
    test("should return 400 if validation fails", async () => {
      const req = mockRequest({ body: {} });
      const res = mockResponse();

      (CreateUrlDto.create as jest.Mock).mockReturnValue(["Invalid URL", null]);

      await controller.createUrl(req, res);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid URL" });
    });

    test("should return 201 if creation succeeds", async () => {
      const req = mockRequest({ body: { longUrl: "https://example.com" } });
      const res = mockResponse();

      (CreateUrlDto.create as jest.Mock).mockReturnValue([
        null,
        {
          long_url: "https://example.com",
          custom_alias: "promo",
          expires_at: undefined,
          max_clicks: undefined,
        },
      ]);

      mockService.createShortUrl.mockResolvedValue({
        ok: true,
        url: {
          id: 1n,
          long_url: "https://example.com",
          short_url: "promo",
          counter: 0,
          created_at: new Date(),
          expires_at: null,
          max_clicks: null,
          custom_alias: true,
        },
      });

      await controller.createUrl(req, res);

      expect(mockService.createShortUrl).toHaveBeenCalledWith("https://example.com", {
        customAlias: "promo",
        expiresAt: undefined,
        maxClicks: undefined,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        originalUrl: "https://example.com",
        shortUrl: "https://test.com/promo",
        expiresAt: null,
        maxClicks: null,
        customAlias: true,
      });
    });

    test("should return 409 if the alias is taken", async () => {
      const req = mockRequest({ body: { longUrl: "https://example.com" } });
      const res = mockResponse();

      (CreateUrlDto.create as jest.Mock).mockReturnValue([
        null,
        { long_url: "https://example.com", custom_alias: "promo" },
      ]);
      mockService.createShortUrl.mockResolvedValue({
        ok: false,
        reason: "taken",
      });

      await controller.createUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ reason: "taken" });
    });

    test("should return 400 with the verdict when the alias is invalid", async () => {
      const req = mockRequest({ body: { longUrl: "https://example.com" } });
      const res = mockResponse();

      (CreateUrlDto.create as jest.Mock).mockReturnValue([
        null,
        { long_url: "https://example.com", custom_alias: "bad alias" },
      ]);

      await controller.createUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ reason: "invalid" });
      expect(mockService.createShortUrl).not.toHaveBeenCalled();
    });

    test("should return 400 with the verdict when the alias is reserved", async () => {
      const req = mockRequest({ body: { longUrl: "https://example.com" } });
      const res = mockResponse();

      (CreateUrlDto.create as jest.Mock).mockReturnValue([
        null,
        { long_url: "https://example.com", custom_alias: "API" },
      ]);

      await controller.createUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ reason: "reserved" });
      expect(mockService.createShortUrl).not.toHaveBeenCalled();
    });

    test("should return 500 if service fails", async () => {
      const req = mockRequest({ body: { longUrl: "https://example.com" } });
      const res = mockResponse();

      (CreateUrlDto.create as jest.Mock).mockReturnValue([
        null,
        { long_url: "https://example.com" },
      ]);
      mockService.createShortUrl.mockResolvedValue({ ok: false, reason: "error" });

      await controller.createUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Something went wrong creating the url",
      });
    });
  });

  describe("getStats", () => {
    test("should return 200 with stats", async () => {
      const req = mockRequest();
      const res = mockResponse();

      mockService.getStats.mockResolvedValue({
        urls: 5,
        clicks: 20,
      });

      await controller.getStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        urls: 5,
        clicks: 20,
      });
    });

    test("should return 500 if stats fail", async () => {
      const req = mockRequest();
      const res = mockResponse();

      mockService.getStats.mockResolvedValue(null);

      await controller.getStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Something went wrong getting stats",
      });
    });
  });

  describe("getLinkStats", () => {
    const stats = {
      shortUrl: "abc",
      originalUrl: "https://example.com",
      totalClicks: 3,
      uniqueClicks: 2,
      createdAt: new Date(),
      expiresAt: null,
      maxClicks: null,
      clicksByDay: [],
      topReferrers: [],
      topDevices: [],
      topCountries: [],
    };

    test("should return 400 if shortUrl is not a string", async () => {
      const req = mockRequest({ params: { shortUrl: 123 } });
      const res = mockResponse();

      await controller.getLinkStats(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 404 if the url does not exist", async () => {
      const req = mockRequest({ params: { shortUrl: "abc" } });
      const res = mockResponse();

      mockService.getLinkStats.mockResolvedValue(null);

      await controller.getLinkStats(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Url abc not found" });
    });

    test("should return 200 with link stats", async () => {
      const req = mockRequest({ params: { shortUrl: "abc" } });
      const res = mockResponse();

      mockService.getLinkStats.mockResolvedValue(stats);

      await controller.getLinkStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(stats);
    });
  });

  describe("getBatchStats", () => {
    test.each([
      [{}, "missing shortUrls"],
      [{ shortUrls: [] }, "empty shortUrls"],
      [{ shortUrls: [1, 2] }, "non string entries"],
      [{ shortUrls: Array(101).fill("abc") }, "too many entries"],
    ])("should return 400 for %s", async (body: any, _label: string) => {
      const req = mockRequest({ body });
      const res = mockResponse();

      await controller.getBatchStats(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.getStatsByShortUrls).not.toHaveBeenCalled();
    });

    test("should return 200 with the link summaries", async () => {
      const links = [
        {
          shortUrl: "abc",
          originalUrl: "https://example.com",
          totalClicks: 2,
          createdAt: new Date(),
          expiresAt: null,
          maxClicks: null,
        },
      ];
      const req = mockRequest({ body: { shortUrls: ["abc"] } });
      const res = mockResponse();

      mockService.getStatsByShortUrls.mockResolvedValue(links);

      await controller.getBatchStats(req, res);

      expect(mockService.getStatsByShortUrls).toHaveBeenCalledWith(["abc"]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ links });
    });
  });

  describe("checkAlias", () => {
    test("should report invalid aliases", async () => {
      const req = mockRequest({ params: { alias: "a b" } });
      const res = mockResponse();

      await controller.checkAlias(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        available: false,
        reason: "invalid",
      });
      expect(mockService.isAliasAvailable).not.toHaveBeenCalled();
    });

    test("should report reserved aliases", async () => {
      const req = mockRequest({ params: { alias: "API" } });
      const res = mockResponse();

      await controller.checkAlias(req, res);

      expect(res.json).toHaveBeenCalledWith({
        available: false,
        reason: "reserved",
      });
    });

    test("should report taken aliases", async () => {
      const req = mockRequest({ params: { alias: "promo" } });
      const res = mockResponse();

      mockService.isAliasAvailable.mockResolvedValue(false);

      await controller.checkAlias(req, res);

      expect(res.json).toHaveBeenCalledWith({
        available: false,
        reason: "taken",
      });
    });

    test("should report available aliases", async () => {
      const req = mockRequest({ params: { alias: "promo" } });
      const res = mockResponse();

      mockService.isAliasAvailable.mockResolvedValue(true);

      await controller.checkAlias(req, res);

      expect(res.json).toHaveBeenCalledWith({ available: true, reason: null });
    });

    test("should return 500 when the service fails", async () => {
      const req = mockRequest({ params: { alias: "promo" } });
      const res = mockResponse();

      mockService.isAliasAvailable.mockResolvedValue(null);

      await controller.checkAlias(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
