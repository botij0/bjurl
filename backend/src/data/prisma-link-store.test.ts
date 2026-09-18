import type { PrismaClient } from "../generated/prisma/client";
import { LinkCodeConflictError } from "./link-store";
import { PrismaLinkStore } from "./prisma-link-store";

jest.mock("./postgres", () => ({ prisma: {} }));

const uniqueViolation = Object.assign(new Error("Unique constraint failed"), {
  code: "P2002",
});

const link = {
  id: 1n,
  long_url: "https://example.com",
  short_url: "abc",
  counter: 0,
  created_at: new Date("2026-01-01T00:00:00Z"),
  expires_at: null,
  max_clicks: null,
  custom_alias: false,
};

const fakeClient = () => ({
  url: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  click: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
});

describe("PrismaLinkStore", () => {
  let client: ReturnType<typeof fakeClient>;
  let store: PrismaLinkStore;

  beforeEach(() => {
    client = fakeClient();
    client.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback(client),
    );
    store = new PrismaLinkStore(client as unknown as PrismaClient);
  });

  describe("findByCode", () => {
    test("should read a link by its short url", async () => {
      client.url.findUnique.mockResolvedValue(link);

      expect(await store.findByCode("abc")).toBe(link);
      expect(client.url.findUnique).toHaveBeenCalledWith({
        where: { short_url: "abc" },
      });
    });
  });

  describe("codeExists", () => {
    test("should read only the id, not the whole row", async () => {
      client.url.findUnique.mockResolvedValue({ id: 1n });

      expect(await store.codeExists("abc")).toBe(true);
      expect(client.url.findUnique).toHaveBeenCalledWith({
        where: { short_url: "abc" },
        select: { id: true },
      });
    });

    test("should report a free code", async () => {
      client.url.findUnique.mockResolvedValue(null);

      expect(await store.codeExists("abc")).toBe(false);
    });
  });

  describe("claimRedirect", () => {
    test("should report a missing code", async () => {
      client.url.findUnique.mockResolvedValue(null);

      expect(await store.claimRedirect("abc", new Date())).toEqual({
        ok: false,
        reason: "not_found",
      });
      expect(client.url.updateMany).not.toHaveBeenCalled();
    });

    test("should report gone when the conditional increment matches nothing", async () => {
      client.url.findUnique.mockResolvedValue(link);
      client.url.updateMany.mockResolvedValue({ count: 0 });

      expect(await store.claimRedirect("abc", new Date())).toEqual({
        ok: false,
        reason: "gone",
      });
    });

    test("should hand back the link with the counter already advanced", async () => {
      client.url.findUnique.mockResolvedValue(link);
      client.url.updateMany.mockResolvedValue({ count: 1 });

      expect(await store.claimRedirect("abc", new Date())).toEqual({
        ok: true,
        link: expect.objectContaining({ id: 1n, counter: 1 }),
      });
    });

    test("should leave an unbounded link with no extra predicate", async () => {
      client.url.findUnique.mockResolvedValue(link);
      client.url.updateMany.mockResolvedValue({ count: 1 });

      await store.claimRedirect("abc", new Date());

      expect(client.url.updateMany).toHaveBeenCalledWith({
        where: { id: 1n },
        data: { counter: { increment: 1 } },
      });
    });

    test("should refuse a link that expires before now", async () => {
      const now = new Date("2026-05-01T00:00:00Z");
      client.url.findUnique.mockResolvedValue({
        ...link,
        expires_at: new Date("2026-01-02T00:00:00Z"),
      });
      client.url.updateMany.mockResolvedValue({ count: 1 });

      await store.claimRedirect("abc", now);

      expect(client.url.updateMany).toHaveBeenCalledWith({
        where: { id: 1n, expires_at: { gt: now } },
        data: { counter: { increment: 1 } },
      });
    });

    test("should refuse a link that reached its click limit", async () => {
      client.url.findUnique.mockResolvedValue({ ...link, max_clicks: 5 });
      client.url.updateMany.mockResolvedValue({ count: 1 });

      await store.claimRedirect("abc", new Date());

      expect(client.url.updateMany).toHaveBeenCalledWith({
        where: { id: 1n, counter: { lt: 5 } },
        data: { counter: { increment: 1 } },
      });
    });
  });

  describe("insertLink", () => {
    const input = { long_url: "https://example.com", custom_alias: true };

    test("should insert and assign the first candidate in one transaction", async () => {
      client.url.create.mockResolvedValue({ ...link, short_url: null });
      client.url.update.mockResolvedValue(link);

      const created = await store.insertLink(input, (id) => [`code-${id}`]);

      expect(client.$transaction).toHaveBeenCalledTimes(1);
      expect(client.url.create).toHaveBeenCalledWith({
        data: {
          long_url: "https://example.com",
          custom_alias: true,
          expires_at: undefined,
          max_clicks: undefined,
        },
      });
      expect(client.url.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: { short_url: "code-1" },
      });
      expect(created).toBe(link);
    });

    test("should walk to the next candidate when a code is already in use", async () => {
      client.url.create.mockResolvedValue({ ...link, short_url: null });
      client.url.update
        .mockRejectedValueOnce(uniqueViolation)
        .mockResolvedValueOnce({ ...link, short_url: "second" });

      const created = await store.insertLink(input, () => ["first", "second"]);

      expect(client.url.update).toHaveBeenCalledTimes(2);
      expect(created.short_url).toBe("second");
    });

    test("should report a code conflict when every candidate is in use", async () => {
      client.url.create.mockResolvedValue({ ...link, short_url: null });
      client.url.update.mockRejectedValue(uniqueViolation);

      await expect(
        store.insertLink(input, () => ["first", "second"]),
      ).rejects.toThrow(LinkCodeConflictError);
    });

    test("should let a non-conflict error through untouched", async () => {
      client.url.create.mockResolvedValue({ ...link, short_url: null });
      client.url.update.mockRejectedValue(new Error("connection reset"));

      await expect(store.insertLink(input, () => ["first"])).rejects.toThrow(
        "connection reset",
      );
    });
  });

  describe("findManyByCodes", () => {
    test("should read every link in the set", async () => {
      client.url.findMany.mockResolvedValue([link]);

      expect(await store.findManyByCodes(["abc", "def"])).toEqual([link]);
      expect(client.url.findMany).toHaveBeenCalledWith({
        where: { short_url: { in: ["abc", "def"] } },
      });
    });
  });

  describe("totalStats", () => {
    test("should total links and logged clicks", async () => {
      client.url.count.mockResolvedValue(5);
      client.click.count.mockResolvedValue(20);

      expect(await store.totalStats()).toEqual({ urls: 5, clicks: 20 });
      expect(client.url.aggregate).not.toHaveBeenCalled();
    });

    test("should report no clicks when nothing was logged", async () => {
      client.url.count.mockResolvedValue(0);
      client.click.count.mockResolvedValue(0);

      expect(await store.totalStats()).toEqual({ urls: 0, clicks: 0 });
    });
  });

  describe("clickCountsFor", () => {
    test("should count logged clicks per link", async () => {
      client.click.groupBy.mockResolvedValue([
        { url_id: 1n, _count: { _all: 3 } },
        { url_id: 2n, _count: { _all: 1 } },
      ]);

      expect(await store.clickCountsFor([1n, 2n])).toEqual([
        { url_id: 1n, count: 3 },
        { url_id: 2n, count: 1 },
      ]);
      expect(client.click.groupBy).toHaveBeenCalledWith({
        by: ["url_id"],
        where: { url_id: { in: [1n, 2n] } },
        _count: { _all: true },
      });
    });

    test("should say nothing about links without clicks", async () => {
      client.click.groupBy.mockResolvedValue([]);

      expect(await store.clickCountsFor([1n])).toEqual([]);
    });
  });

  describe("clicksFor", () => {
    test("should select only the fields the aggregation needs", async () => {
      client.click.findMany.mockResolvedValue([]);

      await store.clicksFor(1n);

      expect(client.click.findMany).toHaveBeenCalledWith({
        where: { url_id: 1n },
        select: {
          referrer: true,
          user_agent: true,
          ip_hash: true,
          country: true,
          clicked_at: true,
        },
      });
    });
  });

  describe("linkStatsFor", () => {
    test("should aggregate with grouped queries instead of loading rows", async () => {
      client.click.count.mockResolvedValue(4);
      client.$queryRaw
        .mockResolvedValueOnce([{ count: 2n }])
        .mockResolvedValueOnce([
          { date: "2026-09-11", count: 3n },
          { date: "2026-09-10", count: 1n },
        ]);
      client.click.groupBy
        .mockResolvedValueOnce([
          { referrer: "https://google.com", _count: { _all: 3 } },
          { referrer: "   ", _count: { _all: 1 } },
        ])
        .mockResolvedValueOnce([
          {
            user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            _count: { _all: 2 },
          },
          {
            user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile",
            _count: { _all: 1 },
          },
          { user_agent: "Googlebot/2.1", _count: { _all: 1 } },
        ])
        .mockResolvedValueOnce([
          { country: "ES", _count: { _all: 2 } },
          { country: null, _count: { _all: 2 } },
        ]);

      const stats = await store.linkStatsFor(7n);

      expect(stats).toEqual({
        totalClicks: 4,
        uniqueClicks: 2,
        clicksByDay: [
          { date: "2026-09-10", count: 1 },
          { date: "2026-09-11", count: 3 },
        ],
        topReferrers: [
          { referrer: "https://google.com", count: 3 },
          { referrer: "direct", count: 1 },
        ],
        topDevices: [
          { device: "desktop", count: 2 },
          { device: "bot", count: 1 },
          { device: "mobile", count: 1 },
        ],
        topCountries: [{ country: "ES", count: 2 }],
      });

      expect(client.click.findMany).not.toHaveBeenCalled();
      expect(client.click.count).toHaveBeenCalledWith({
        where: { url_id: 7n },
      });
      expect(client.click.groupBy).toHaveBeenNthCalledWith(1, {
        by: ["referrer"],
        where: { url_id: 7n },
        _count: { _all: true },
      });
      expect(client.click.groupBy).toHaveBeenNthCalledWith(2, {
        by: ["user_agent"],
        where: { url_id: 7n },
        _count: { _all: true },
      });
      expect(client.click.groupBy).toHaveBeenNthCalledWith(3, {
        by: ["country"],
        where: { url_id: 7n },
        _count: { _all: true },
      });
      expect(client.$queryRaw).toHaveBeenCalledTimes(2);
    });

    test("should report an empty aggregate for a link without clicks", async () => {
      client.click.count.mockResolvedValue(0);
      client.$queryRaw
        .mockResolvedValueOnce([{ count: 0n }])
        .mockResolvedValueOnce([]);
      client.click.groupBy.mockResolvedValue([]);

      expect(await store.linkStatsFor(7n)).toEqual({
        totalClicks: 0,
        uniqueClicks: 0,
        clicksByDay: [],
        topReferrers: [],
        topDevices: [],
        topCountries: [],
      });
    });

    test("should cap each breakdown at five entries", async () => {
      client.click.count.mockResolvedValue(6);
      client.$queryRaw
        .mockResolvedValueOnce([{ count: 6n }])
        .mockResolvedValueOnce([{ date: "2026-09-10", count: 6n }]);
      client.click.groupBy
        .mockResolvedValueOnce(
          ["r5", "r4", "r3", "r2", "r1", "r0"].map((referrer) => ({
            referrer,
            _count: { _all: 1 },
          })),
        )
        .mockResolvedValueOnce([
          { user_agent: null, _count: { _all: 6 } },
        ])
        .mockResolvedValueOnce(
          ["c5", "c4", "c3", "c2", "c1", "c0"].map((country) => ({
            country,
            _count: { _all: 1 },
          })),
        );

      const stats = await store.linkStatsFor(7n);

      expect(stats.topReferrers).toEqual([
        { referrer: "r0", count: 1 },
        { referrer: "r1", count: 1 },
        { referrer: "r2", count: 1 },
        { referrer: "r3", count: 1 },
        { referrer: "r4", count: 1 },
      ]);
      expect(stats.topCountries).toHaveLength(5);
      expect(stats.topDevices).toEqual([{ device: "unknown", count: 6 }]);
    });
  });

  describe("recordClick", () => {
    test("should write the click against its link", async () => {
      await store.recordClick({
        url_id: 1n,
        referrer: "https://google.com",
        user_agent: "Mozilla/5.0",
        ip_hash: "abc",
        country: "ES",
      });

      expect(client.click.create).toHaveBeenCalledWith({
        data: {
          url_id: 1n,
          referrer: "https://google.com",
          user_agent: "Mozilla/5.0",
          ip_hash: "abc",
          country: "ES",
        },
      });
    });
  });
});
