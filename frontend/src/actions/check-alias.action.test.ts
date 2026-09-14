import AxiosMockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, test } from "vitest";

import { urlApi } from "@/api/url.api";
import { checkAlias } from "./check-alias.action";

describe("checkAlias", () => {
  const urlApiMock = new AxiosMockAdapter(urlApi);

  beforeEach(() => {
    urlApiMock.reset();
  });

  test("should return the availability of an alias", async () => {
    urlApiMock.onGet("/alias/promo/available").reply(200, {
      available: true,
      reason: null,
    });

    const result = await checkAlias("promo");

    expect(result).toEqual({ available: true, reason: null });
  });

  test("should return why an alias is not available", async () => {
    urlApiMock.onGet("/alias/promo/available").reply(200, {
      available: false,
      reason: "taken",
    });

    const result = await checkAlias("promo");

    expect(result).toEqual({ available: false, reason: "taken" });
  });

  test("should encode the alias", async () => {
    urlApiMock.onGet("/alias/my%20alias/available").reply(200, {
      available: false,
      reason: "invalid",
    });

    const result = await checkAlias("my alias");

    expect(result).toEqual({ available: false, reason: "invalid" });
  });

  test("should return null on request errors", async () => {
    urlApiMock.onGet("/alias/promo/available").reply(500, {});

    const result = await checkAlias("promo");

    expect(result).toBeNull();
  });
});
