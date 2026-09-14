import AxiosMockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, test } from "vitest";

import { urlApi } from "@/api/url.api";
import { getBatchStats } from "./get-batch-stats.action";

describe("getBatchStats", () => {
  const urlApiMock = new AxiosMockAdapter(urlApi);

  beforeEach(() => {
    urlApiMock.reset();
  });

  test("should return the link summaries", async () => {
    const links = [
      {
        shortUrl: "abc",
        originalUrl: "https://test.com",
        totalClicks: 3,
        createdAt: "2026-09-14T00:00:00.000Z",
        expiresAt: null,
        maxClicks: null,
      },
    ];
    urlApiMock.onPost("/url/batch-stats").reply(200, { links });

    const result = await getBatchStats(["abc"]);

    expect(result).toEqual(links);
    expect(JSON.parse(urlApiMock.history.post[0].data)).toEqual({
      shortUrls: ["abc"],
    });
  });

  test("should return an empty array without calling the API", async () => {
    const result = await getBatchStats([]);

    expect(result).toEqual([]);
    expect(urlApiMock.history.post).toHaveLength(0);
  });

  test("should return an empty array on errors", async () => {
    urlApiMock.onPost("/url/batch-stats").reply(500, {});

    const result = await getBatchStats(["abc"]);

    expect(result).toEqual([]);
  });
});
