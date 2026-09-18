import { beforeEach, describe, expect, test } from "vitest";

import {
  addLinkToHistory,
  clearLinkHistory,
  getLinkHistory,
  removeLinkFromHistory,
} from "./link-history";

describe("link-history", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("should return an empty list when there is no history", () => {
    expect(getLinkHistory()).toEqual([]);
  });

  test("should add links to the history", () => {
    addLinkToHistory({
      shortUrl: "https://bjurl.test/abc",
      originalUrl: "https://example.com",
      expiresAt: null,
      maxClicks: null,
    });

    const history = getLinkHistory();

    expect(history).toHaveLength(1);
    expect(history[0]).toEqual(
      expect.objectContaining({
        shortUrl: "https://bjurl.test/abc",
        originalUrl: "https://example.com",
        expiresAt: null,
        maxClicks: null,
      }),
    );
    expect(history[0].createdAt).toBeDefined();
  });

  test("should keep the newest link first and avoid duplicates", () => {
    addLinkToHistory({ shortUrl: "https://bjurl.test/one", originalUrl: "https://one.com" });
    addLinkToHistory({ shortUrl: "https://bjurl.test/two", originalUrl: "https://two.com" });
    addLinkToHistory({ shortUrl: "https://bjurl.test/one", originalUrl: "https://one.com" });

    const history = getLinkHistory();

    expect(history).toHaveLength(2);
    expect(history[0].shortUrl).toBe("https://bjurl.test/one");
    expect(history[1].shortUrl).toBe("https://bjurl.test/two");
  });

  test("should remove a link from the history", () => {
    addLinkToHistory({ shortUrl: "https://bjurl.test/one", originalUrl: "https://one.com" });
    addLinkToHistory({ shortUrl: "https://bjurl.test/two", originalUrl: "https://two.com" });

    const history = removeLinkFromHistory("https://bjurl.test/one");

    expect(history).toHaveLength(1);
    expect(history[0].shortUrl).toBe("https://bjurl.test/two");
  });

  test("should clear the history", () => {
    addLinkToHistory({ shortUrl: "https://bjurl.test/one", originalUrl: "https://one.com" });

    clearLinkHistory();

    expect(getLinkHistory()).toEqual([]);
  });

  test("should ignore corrupted data", () => {
    localStorage.setItem("bjurl:links", "not-json");

    expect(getLinkHistory()).toEqual([]);
  });

  test("should ignore a stored value that is not an array", () => {
    localStorage.setItem("bjurl:links", JSON.stringify({ nope: true }));

    expect(getLinkHistory()).toEqual([]);
  });

  test("should re-apply the entry cap when reading an oversized list", () => {
    const oversized = Array.from({ length: 150 }, (_, index) => ({
      shortUrl: `https://bjurl.test/${index}`,
      originalUrl: "https://example.com",
      createdAt: "2026-09-01T10:00:00.000Z",
      expiresAt: null,
      maxClicks: null,
    }));
    localStorage.setItem("bjurl:links", JSON.stringify(oversized));

    const history = getLinkHistory();

    expect(history).toHaveLength(100);
    expect(history[0].shortUrl).toBe("https://bjurl.test/0");
    expect(history[99].shortUrl).toBe("https://bjurl.test/99");
  });

  test("should drop entries that do not match the stored shape", () => {
    localStorage.setItem(
      "bjurl:links",
      JSON.stringify([
        {
          shortUrl: "https://bjurl.test/one",
          originalUrl: "https://one.com",
          createdAt: "2026-09-01T10:00:00.000Z",
          expiresAt: null,
          maxClicks: null,
        },
        { shortUrl: 42 },
        null,
        "nope",
      ]),
    );

    const history = getLinkHistory();

    expect(history).toHaveLength(1);
    expect(history[0].shortUrl).toBe("https://bjurl.test/one");
  });

  test("should normalise missing optional fields to null", () => {
    localStorage.setItem(
      "bjurl:links",
      JSON.stringify([
        {
          shortUrl: "https://bjurl.test/one",
          originalUrl: "https://one.com",
          createdAt: "2026-09-01T10:00:00.000Z",
        },
      ]),
    );

    expect(getLinkHistory()).toEqual([
      {
        shortUrl: "https://bjurl.test/one",
        originalUrl: "https://one.com",
        createdAt: "2026-09-01T10:00:00.000Z",
        expiresAt: null,
        maxClicks: null,
      },
    ]);
  });
});
