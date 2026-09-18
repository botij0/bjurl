import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import express from "express";

import { prisma } from "./data/postgres";
import { AppRoutes } from "./routes";

jest.mock("./data/postgres", () => ({
  prisma: {
    url: {
      findUnique: jest.fn(),
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
