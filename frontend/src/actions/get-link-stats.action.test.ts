import AxiosMockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, test } from "vitest";

import { urlApi } from "@/api/url.api";
import { getLinkStats } from "./get-link-stats.action";

describe("getLinkStats", () => {
  const urlApiMock = new AxiosMockAdapter(urlApi);

  beforeEach(() => {
    urlApiMock.reset();
  });

  test("should return the link stats", async () => {
    const stats = {
      shortUrl: "abc",
      originalUrl: "https://test.com",
      totalClicks: 3,
      uniqueClicks: 2,
      createdAt: "2026-09-14T00:00:00.000Z",
      expiresAt: null,
      maxClicks: null,
      clicksByDay: [{ date: "2026-09-14", count: 3 }],
      topReferrers: [],
      topDevices: [],
      topCountries: [],
    };
    urlApiMock.onGet("/url/abc/stats").reply(200, stats);

    const result = await getLinkStats("abc");

    expect(result).toEqual(stats);
  });

  test("should return null when the link does not exist", async () => {
    urlApiMock.onGet("/url/missing/stats").reply(404, {});

    const result = await getLinkStats("missing");

    expect(result).toBeNull();
  });
});
