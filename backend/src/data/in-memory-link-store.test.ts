import { InMemoryLinkStore } from "./in-memory-link-store";
import type { ClickRow } from "./link-store";

const seed = (
  store: InMemoryLinkStore,
  urlId: bigint,
  click: Omit<ClickRow, "clicked_at"> & { clicked_at: Date },
) => store.seedClick({ url_id: urlId, ...click });

describe("InMemoryLinkStore", () => {
  let store: InMemoryLinkStore;

  beforeEach(() => {
    store = new InMemoryLinkStore();
  });

  const insert = () =>
    store.insertLink({ long_url: "https://example.com" }, () => ["abc123"]);

  describe("linkStatsFor", () => {
    test("should aggregate clicks by day, referrer, device and country", async () => {
      const link = await insert();

      seed(store, link.id, {
        referrer: "  ",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        ip_hash: "hash-1",
        country: "US",
        clicked_at: new Date("2026-09-10T10:00:00Z"),
      });
      seed(store, link.id, {
        referrer: " https://google.com ",
        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile",
        ip_hash: "hash-2",
        country: "ES",
        clicked_at: new Date("2026-09-11T10:00:00Z"),
      });
      seed(store, link.id, {
        referrer: "https://google.com",
        user_agent: "Googlebot/2.1",
        ip_hash: "hash-1",
        country: null,
        clicked_at: new Date("2026-09-11T12:00:00Z"),
      });

      expect(await store.linkStatsFor(link.id)).toEqual({
        totalClicks: 3,
        uniqueClicks: 2,
        clicksByDay: [
          { date: "2026-09-10", count: 1 },
          { date: "2026-09-11", count: 2 },
        ],
        topReferrers: [
          { referrer: "https://google.com", count: 2 },
          { referrer: "direct", count: 1 },
        ],
        topDevices: [
          { device: "bot", count: 1 },
          { device: "desktop", count: 1 },
          { device: "mobile", count: 1 },
        ],
        topCountries: [
          { country: "ES", count: 1 },
          { country: "US", count: 1 },
        ],
      });
    });

    test("should report an empty aggregate for a link without clicks", async () => {
      const link = await insert();

      expect(await store.linkStatsFor(link.id)).toEqual({
        totalClicks: 0,
        uniqueClicks: 0,
        clicksByDay: [],
        topReferrers: [],
        topDevices: [],
        topCountries: [],
      });
    });

    test("should only count clicks belonging to the requested link", async () => {
      const one = await insert();
      const two = await store.insertLink(
        { long_url: "https://other.example" },
        () => ["def456"],
      );

      seed(store, two.id, {
        referrer: null,
        user_agent: null,
        ip_hash: null,
        country: "FR",
        clicked_at: new Date("2026-09-12T00:00:00Z"),
      });

      expect(await store.linkStatsFor(one.id)).toEqual(
        expect.objectContaining({ totalClicks: 0, uniqueClicks: 0 }),
      );
    });
  });
});
