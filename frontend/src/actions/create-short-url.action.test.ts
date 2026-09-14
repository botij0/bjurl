import AxiosMockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, test } from "vitest";

import { urlApi } from "@/api/url.api";
import { createShortUrl } from "./create-short-url.action";

describe("createShortUrl", () => {
  const urlApiMock = new AxiosMockAdapter(urlApi);

  beforeEach(() => {
    urlApiMock.reset();
  });

  test("Can create an url", async () => {
    const longUrl = "https://test.com";
    urlApiMock.onPost("/url").reply(201, {
      originalUrl: longUrl,
      shortUrl: "https://bjurl.test/t",
    });

    const response = await createShortUrl(longUrl);

    expect(response).toStrictEqual({
      ok: true,
      data: {
        originalUrl: longUrl,
        shortUrl: "https://bjurl.test/t",
      },
    });
  });

  test("should send the link options in the body", async () => {
    const longUrl = "https://test.com";
    urlApiMock.onPost("/url").reply(201, {
      originalUrl: longUrl,
      shortUrl: "https://bjurl.test/promo",
    });

    await createShortUrl(longUrl, {
      customAlias: "promo",
      expiresAt: "2027-01-01T00:00:00.000Z",
      maxClicks: 1,
    });

    const body = JSON.parse(urlApiMock.history.post[0].data);
    expect(body).toEqual({
      longUrl,
      customAlias: "promo",
      expiresAt: "2027-01-01T00:00:00.000Z",
      maxClicks: 1,
    });
  });

  test("should omit empty options", async () => {
    urlApiMock.onPost("/url").reply(201, {
      originalUrl: "https://test.com",
      shortUrl: "https://bjurl.test/t",
    });

    await createShortUrl("https://test.com", { customAlias: "", expiresAt: "" });

    const body = JSON.parse(urlApiMock.history.post[0].data);
    expect(body.customAlias).toBeUndefined();
    expect(body.expiresAt).toBeUndefined();
  });

  test("should return the API error message and status", async () => {
    urlApiMock.onPost("/url").reply(409, {
      error: "This alias is already in use",
    });

    const response = await createShortUrl("https://test.com", {
      customAlias: "promo",
    });

    expect(response).toEqual({
      ok: false,
      status: 409,
      error: "This alias is already in use",
    });
  });

  test("should return a generic error when the server fails", async () => {
    urlApiMock.onPost("/url").reply(500, {});

    const response = await createShortUrl("https://test.com");

    expect(response).toEqual({
      ok: false,
      status: 500,
      error: "Something went wrong, please try again",
    });
  });
});
