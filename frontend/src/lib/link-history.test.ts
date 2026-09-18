import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

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

  afterEach(() => {
    vi.restoreAllMocks();
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

  test("should return the new link when storage rejects the write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    const entries = addLinkToHistory({
      shortUrl: "https://bjurl.test/abc",
      originalUrl: "https://example.com",
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].shortUrl).toBe("https://bjurl.test/abc");
  });

  test("should return the remaining links when storage rejects the write on remove", () => {
    localStorage.setItem(
      "bjurl:links",
      JSON.stringify([
        { shortUrl: "https://bjurl.test/one", originalUrl: "https://one.com" },
        { shortUrl: "https://bjurl.test/two", originalUrl: "https://two.com" },
      ]),
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    const entries = removeLinkFromHistory("https://bjurl.test/one");

    expect(entries).toHaveLength(1);
    expect(entries[0].shortUrl).toBe("https://bjurl.test/two");
  });

  test("should not throw when clearing and storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("SecurityError");
    });

    expect(() => clearLinkHistory()).not.toThrow();
  });

  test("should cap the history at one hundred entries", () => {
    for (let i = 0; i < 105; i++) {
      addLinkToHistory({
        shortUrl: `https://bjurl.test/${i}`,
        originalUrl: `https://example.com/${i}`,
      });
    }

    const history = getLinkHistory();

    expect(history).toHaveLength(100);
    expect(history[0].shortUrl).toBe("https://bjurl.test/104");
    expect(history.at(-1)!.shortUrl).toBe("https://bjurl.test/5");
    expect(history.some((entry) => entry.shortUrl === "https://bjurl.test/0")).toBe(
      false,
    );
  });
});
