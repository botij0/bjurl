import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";

import express from "express";

import { prisma } from "./data/postgres";
import { AppRoutes } from "./routes";
import { UrlService } from "./services/url.service";

jest.mock("./data/postgres", () => ({
  prisma: {
    url: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("./config/logger", () => ({
  buildLogger: () => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const app = express();
app.use(express.json());
app.use(AppRoutes.routes);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});
app.get(/(.*)/, (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

let server: Server;
let baseUrl: string;

beforeAll((done) => {
  server = app.listen(0, () => {
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

const answer = async (shortUrl: string) => {
  const response = await fetch(`${baseUrl}/api/alias/${shortUrl}/available`);
  return { status: response.status, body: await response.json() };
};

const create = async (body: unknown) => {
  const response = await fetch(`${baseUrl}/api/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

const postRaw = async (init: RequestInit) => {
  const response = await fetch(`${baseUrl}/api/url`, { method: "POST", ...init });
  return { status: response.status, body: await response.json() };
};

describe("the alias verdict over the HTTP seam", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("answers free when the alias is unused", async () => {
    (prisma.url.findUnique as jest.Mock).mockResolvedValue(null);

    expect(await answer("promo")).toEqual({
      status: 200,
      body: { available: true, reason: null },
    });
  });

  test("answers taken when the alias exists", async () => {
    (prisma.url.findUnique as jest.Mock).mockResolvedValue({ id: 1n });

    expect(await answer("promo")).toEqual({
      status: 200,
      body: { available: false, reason: "taken" },
    });
  });

  test("answers the availability question case-insensitively", async () => {
    (prisma.url.findUnique as jest.Mock).mockResolvedValue(null);

    expect(await answer("Promo")).toEqual({
      status: 200,
      body: { available: true, reason: null },
    });
    expect(prisma.url.findUnique).toHaveBeenCalledWith({
      where: { short_url: "promo" },
      select: { id: true },
    });
  });

  test("answers the rule without touching the store", async () => {
    expect(await answer("stats")).toEqual({
      status: 200,
      body: { available: false, reason: "reserved" },
    });
    expect(await answer("ab")).toEqual({
      status: 200,
      body: { available: false, reason: "invalid" },
    });
    expect(prisma.url.findUnique).not.toHaveBeenCalled();
  });

  test("refuses a reserved alias on create with the word the check uses", async () => {
    const refused = await create({
      longUrl: "https://example.com",
      customAlias: "stats",
    });

    expect(refused).toEqual({
      status: 400,
      body: { reason: "reserved" },
    });
    expect(prisma.url.findUnique).not.toHaveBeenCalled();
  });

  test("refuses an invalid alias on create with the word the check uses", async () => {
    expect(
      await create({ longUrl: "https://example.com", customAlias: "bad alias" }),
    ).toEqual({ status: 400, body: { reason: "invalid" } });
  });

  test("keeps free-text errors for validation that is not about an alias", async () => {
    expect(await create({ longUrl: "nope" })).toEqual({
      status: 400,
      body: { error: "Please provide a valid URL (e.g. https://example.com)" },
    });
  });
});

describe("the SPA fallback ordering", () => {
  let getLongUrl: jest.SpyInstance;

  beforeEach(() => {
    getLongUrl = jest.spyOn(UrlService.prototype, "getLongUrl");
  });

  afterEach(() => {
    getLongUrl.mockRestore();
  });

  test("serves the SPA for /links without resolving a short code", async () => {
    const response = await fetch(`${baseUrl}/links`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("html");
    expect(await response.text()).toContain('<div id="root">');
    expect(getLongUrl).not.toHaveBeenCalled();
  });

  test("serves the SPA for / without resolving a short code", async () => {
    const response = await fetch(`${baseUrl}/`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<div id="root">');
    expect(getLongUrl).not.toHaveBeenCalled();
  });

  test("still redirects a real short code", async () => {
    getLongUrl.mockResolvedValue({
      ok: true,
      url: { long_url: "https://example.com" },
    });

    const response = await fetch(`${baseUrl}/abc123`, {
      redirect: "manual",
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://example.com");
    expect(getLongUrl).toHaveBeenCalledWith("abc123", expect.any(Object));
  });
});

describe("the create endpoint's body validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects a request with no body and no content-type as a 400", async () => {
    expect(await postRaw({})).toEqual({
      status: 400,
      body: { error: "Long Url is required" },
    });
  });

  test("rejects a non-JSON body as a 400", async () => {
    expect(
      await postRaw({
        headers: { "Content-Type": "text/plain" },
        body: "https://example.com",
      }),
    ).toEqual({
      status: 400,
      body: { error: "Long Url is required" },
    });
  });

  test("leaves a well-formed JSON request unaffected", async () => {
    const created = {
      id: 1n,
      long_url: "https://example.com",
      short_url: "b",
      counter: 0,
      created_at: new Date(),
      expires_at: null,
      max_clicks: null,
      custom_alias: false,
    };
    (prisma.url.create as jest.Mock).mockResolvedValue({
      ...created,
      short_url: null,
    });
    (prisma.url.update as jest.Mock).mockResolvedValue(created);

    expect(await create({ longUrl: "https://example.com" })).toEqual({
      status: 201,
      body: {
        originalUrl: "https://example.com",
        shortUrl: "https://test.com/b",
        expiresAt: null,
        maxClicks: null,
        customAlias: false,
      },
    });
  });
});
