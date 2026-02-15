import { UrlController } from "./url.controller";
import { UrlService } from "../services/url.service";
import { CreateUrlDto } from "../data/dtos/create-url.dto";
import { buildLogger } from "../config/logger";

jest.mock("../services/url.service");
jest.mock("../data/dtos/create-url.dto");
jest.mock("../config/logger");
jest.mock("../data/postgres", () => ({
  prisma: {},
}));

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
    } as unknown as jest.Mocked<UrlService>;

    (UrlService as jest.Mock).mockImplementation(() => mockService);

    controller = new UrlController();
  });

  describe("getUrl", () => {
    it("should return 400 if shortUrl is not a string", async () => {
      const req: any = { params: { shortUrl: 123 } };
      const res = mockResponse();

      await controller.getUrl(req, res);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Invalid short URL parameter",
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Wrong Short Url" });
    });

    it("should return 404 if url not found", async () => {
      const req: any = { params: { shortUrl: "abc" } };
      const res = mockResponse();

      mockService.getLongUrl.mockResolvedValue(null);

      await controller.getUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Url abc not found",
      });
    });

    it("should redirect if url exists", async () => {
      const req: any = { params: { shortUrl: "abc" } };
      const res = mockResponse();

      mockService.getLongUrl.mockResolvedValue({
        id: 1,
        long_url: "https://example.com",
        short_url: "abc",
        counter: 1,
      } as any);

      await controller.getUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(302);
      expect(res.redirect).toHaveBeenCalledWith("https://example.com");
    });
  });

  describe("createUrl", () => {
    it("should return 400 if validation fails", async () => {
      const req: any = { body: {} };
      const res = mockResponse();

      (CreateUrlDto.create as jest.Mock).mockReturnValue(["Invalid URL", null]);

      await controller.createUrl(req, res);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid URL" });
    });

    it("should return 201 if creation succeeds", async () => {
      const req: any = { body: { long_url: "https://example.com" } };
      const res = mockResponse();

      (CreateUrlDto.create as jest.Mock).mockReturnValue([
        null,
        { long_url: "https://example.com" },
      ]);

      mockService.createShortUrl.mockResolvedValue({
        id: 1,
        long_url: "https://example.com",
        short_url: "abc123",
      } as any);

      await controller.createUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        originalUrl: "https://example.com",
        shortUrl: "https://test.com/abc123",
      });
    });

    it("should return 500 if service fails", async () => {
      const req: any = { body: { long_url: "https://example.com" } };
      const res = mockResponse();

      (CreateUrlDto.create as jest.Mock).mockReturnValue([
        null,
        { long_url: "https://example.com" },
      ]);

      mockService.createShortUrl.mockResolvedValue(undefined);

      await controller.createUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Something went wrong creating the url",
      });
    });
  });

  describe("getStats", () => {
    it("should return 200 with stats", async () => {
      const req: any = {};
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

    it("should return 500 if stats fail", async () => {
      const req: any = {};
      const res = mockResponse();

      mockService.getStats.mockResolvedValue(null);

      await controller.getStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Something went wrong getting stats",
      });
    });
  });
});
