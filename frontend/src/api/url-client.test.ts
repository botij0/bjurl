import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, test } from "vitest";

import { createUrlClient, resolveApiBaseUrl } from "./url-client";

const instance = axios.create();
const mock = new AxiosMockAdapter(instance);
const urlClient = createUrlClient(instance);

const created = {
  originalUrl: "https://test.com",
  shortUrl: "https://bjurl.test/t",
};

describe("resolveApiBaseUrl", () => {
  test("should use same-origin /api in production", () => {
    expect(resolveApiBaseUrl("http://localhost:3334", true)).toBe("/api");
  });

  test("should use same-origin /api when no origin is set", () => {
    expect(resolveApiBaseUrl(undefined, false)).toBe("/api");
    expect(resolveApiBaseUrl("", false)).toBe("/api");
    expect(resolveApiBaseUrl("   ", false)).toBe("/api");
  });

  test("should join a dev origin to /api", () => {
    expect(resolveApiBaseUrl("http://localhost:3334", false)).toBe(
      "http://localhost:3334/api",
    );
    expect(resolveApiBaseUrl("http://localhost:3334/", false)).toBe(
      "http://localhost:3334/api",
    );
  });
});

describe("urlClient", () => {
  beforeEach(() => {
    mock.reset();
  });

  describe("createShortUrl", () => {
    test("should create a short url", async () => {
      mock.onPost("/url").reply(201, created);

      expect(await urlClient.createShortUrl("https://test.com")).toEqual({
        ok: true,
        data: created,
      });
    });

    test("should send the link options in the body", async () => {
      mock.onPost("/url").reply(201, created);

      await urlClient.createShortUrl("https://test.com", {
        customAlias: "promo",
        expiresAt: "2027-01-01T00:00:00.000Z",
        maxClicks: 1,
      });

      expect(JSON.parse(mock.history.post[0].data)).toEqual({
        longUrl: "https://test.com",
        customAlias: "promo",
        expiresAt: "2027-01-01T00:00:00.000Z",
        maxClicks: 1,
      });
    });

    test("should omit empty options", async () => {
      mock.onPost("/url").reply(201, created);

      await urlClient.createShortUrl("https://test.com", {
        customAlias: "",
        expiresAt: "",
      });

      const body = JSON.parse(mock.history.post[0].data);
      expect(body.customAlias).toBeUndefined();
      expect(body.expiresAt).toBeUndefined();
    });

    test("should report a refused alias as a verdict, not a sentence", async () => {
      mock.onPost("/url").reply(409, { reason: "taken" });

      expect(
        await urlClient.createShortUrl("https://test.com", {
          customAlias: "promo",
        }),
      ).toEqual({ ok: false, kind: "refused", reason: "taken" });
    });

    test("should surface a validation message", async () => {
      mock.onPost("/url").reply(400, {
        error: "Expiration date must be in the future",
      });

      expect(await urlClient.createShortUrl("https://test.com")).toEqual({
        ok: false,
        kind: "error",
        error: "Expiration date must be in the future",
      });
    });

    test("should fall back to a generic message", async () => {
      mock.onPost("/url").reply(500, {});

      expect(await urlClient.createShortUrl("https://test.com")).toEqual({
        ok: false,
        kind: "error",
        error: "Something went wrong, please try again",
      });
    });

    test("should survive a network failure", async () => {
      mock.onPost("/url").networkError();

      expect(await urlClient.createShortUrl("https://test.com")).toEqual({
        ok: false,
        kind: "error",
        error: "Something went wrong, please try again",
      });
    });
  });

  describe("checkAlias", () => {
    test("should return the availability", async () => {
      mock.onGet("/alias/promo/available").reply(200, {
        available: true,
        reason: null,
      });

      expect(await urlClient.checkAlias("promo")).toEqual({
        ok: true,
        data: { available: true, reason: null },
      });
    });

    test("should return why an alias is unavailable", async () => {
      mock.onGet("/alias/promo/available").reply(200, {
        available: false,
        reason: "taken",
      });

      expect(await urlClient.checkAlias("promo")).toEqual({
        ok: true,
        data: { available: false, reason: "taken" },
      });
    });

    test("should encode the alias", async () => {
      mock.onGet("/alias/my%20alias/available").reply(200, {
        available: false,
        reason: "invalid",
      });

      expect(await urlClient.checkAlias("my alias")).toEqual({
        ok: true,
        data: { available: false, reason: "invalid" },
      });
    });

    test("should report a failed check as failed, not as a taken alias", async () => {
      mock.onGet("/alias/promo/available").reply(500, {});

      expect(await urlClient.checkAlias("promo")).toEqual({
        ok: false,
        kind: "error",
      });
    });
  });

  describe("getLinkStats", () => {
    test("should return the analytics", async () => {
      mock.onGet("/url/abc/stats").reply(200, { shortUrl: "abc", totalClicks: 2 });

      expect(await urlClient.getLinkStats("abc")).toEqual({
        ok: true,
        data: { shortUrl: "abc", totalClicks: 2 },
      });
    });

    test("should tell a missing link apart from a failure", async () => {
      mock.onGet("/url/missing/stats").reply(404, { error: "Url missing not found" });

      expect(await urlClient.getLinkStats("missing")).toEqual({
        ok: false,
        kind: "not_found",
      });
    });

    test("should report a failure", async () => {
      mock.onGet("/url/abc/stats").reply(500, {});

      expect(await urlClient.getLinkStats("abc")).toEqual({
        ok: false,
        kind: "error",
      });
    });

    test("should encode the code", async () => {
      mock.onGet("/url/my%20code/stats").reply(200, { shortUrl: "my code" });

      expect(await urlClient.getLinkStats("my code")).toEqual({
        ok: true,
        data: { shortUrl: "my code" },
      });
    });
  });

  describe("getBatchStats", () => {
    test("should return the summaries", async () => {
      mock.onPost("/url/batch-stats").reply(200, { links: [{ shortUrl: "one" }] });

      expect(await urlClient.getBatchStats(["one"])).toEqual({
        ok: true,
        data: [{ shortUrl: "one" }],
      });
      expect(JSON.parse(mock.history.post[0].data)).toEqual({
        shortUrls: ["one"],
      });
    });

    test("should answer an empty list without a request", async () => {
      expect(await urlClient.getBatchStats([])).toEqual({ ok: true, data: [] });
      expect(mock.history.post).toHaveLength(0);
    });

    test("should report a failure instead of an empty list", async () => {
      mock.onPost("/url/batch-stats").reply(500, {});

      expect(await urlClient.getBatchStats(["one"])).toEqual({
        ok: false,
        kind: "error",
      });
    });
  });

  describe("getStats", () => {
    test("should return the totals", async () => {
      mock.onGet("/stats").reply(200, { urls: 5, clicks: 20 });

      expect(await urlClient.getStats()).toEqual({
        ok: true,
        data: { urls: 5, clicks: 20 },
      });
    });

    test("should report a failure", async () => {
      mock.onGet("/stats").reply(500, {});

      expect(await urlClient.getStats()).toEqual({ ok: false, kind: "error" });
    });
  });
});
