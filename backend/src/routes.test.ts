import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import express from "express";

import { prisma } from "./data/postgres";
import { AppRoutes } from "./routes";

jest.mock("./data/postgres", () => {
  const prisma = {
    url: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    click: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    (callback: (tx: typeof prisma) => unknown) => callback(prisma),
  );
  return { prisma };
});

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

const postRaw = async (init: RequestInit = {}) => {
  const response = await fetch(`${baseUrl}/api/url`, { method: "POST", ...init });
  return { status: response.status, body: await response.json() };
};

const resolve = async (
  shortUrl: string,
  headers: Record<string, string> = {},
) => {
  const response = await fetch(`${baseUrl}/${shortUrl}`, {
    redirect: "manual",
    headers,
  });

  return {
    status: response.status,
    location: response.headers.get("location"),
  };
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

describe("the redirect route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const link = {
    id: 1n,
    long_url: "https://example.com/destination",
    short_url: "abc",
    counter: 0,
    created_at: new Date(),
    expires_at: null,
    max_clicks: null,
    custom_alias: false,
  };

  test("sends a known short code to its long url", async () => {
    (prisma.url.findUnique as jest.Mock).mockResolvedValue(link);
    (prisma.url.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    expect(await resolve("abc")).toEqual({
      status: 302,
      location: "https://example.com/destination",
    });
  });

  test("answers 404 for a code that does not exist", async () => {
    (prisma.url.findUnique as jest.Mock).mockResolvedValue(null);

    expect(await resolve("missing")).toEqual({
      status: 404,
      location: null,
    });
  });

  test("answers 410 when the link is gone", async () => {
    (prisma.url.findUnique as jest.Mock).mockResolvedValue({
      ...link,
      expires_at: new Date(Date.now() - 60_000),
    });
    (prisma.url.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    expect(await resolve("abc")).toEqual({
      status: 410,
      location: null,
    });
  });
});

describe("the create endpoint without a body", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("does not create a link when the JSON body is missing", async () => {
    await fetch(`${baseUrl}/api/url`, { method: "POST" });

    expect(prisma.url.findUnique).not.toHaveBeenCalled();
    expect(prisma.url.create).not.toHaveBeenCalled();
    expect(prisma.url.update).not.toHaveBeenCalled();
  });

  test("rejects an empty JSON body as a 400", async () => {
    expect(
      await postRaw({
        headers: { "Content-Type": "application/json" },
        body: "",
      }),
    ).toEqual({
      status: 400,
      body: { error: "Long Url is required" },
    });
  });
});
