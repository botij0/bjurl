import { CreateUrlDto } from "./create-url.dto";

describe("create-url.dto", () => {
  const URL = "https://test.com";
  test("should return a DTO if correct params", () => {
    const result = CreateUrlDto.create({ longUrl: URL });
    expect(result[0]).toBe(undefined);
    expect(result[1]).toBeInstanceOf(CreateUrlDto);
  });

  test("should return error message if longURl is not present", async () => {
    const result = CreateUrlDto.create({ a: 1 });
    expect(result[0]).toBe("Long Url is required");
    expect(result[1]).toBe(undefined);
  });

  test("should return erro message if longURl is not a string", async () => {
    const result = CreateUrlDto.create({ longUrl: 1 });
    expect(result[0]).toBe("Long Url is required");
    expect(result[1]).toBe(undefined);
  });

  test("should return error message if longURl is an invalid Url", async () => {
    const result = CreateUrlDto.create({ longUrl: "invalid url" });
    expect(result[0]).toBe("Please provide a valid URL (e.g. https://example.com)");
    expect(result[1]).toBe(undefined);
  });

  describe("custom alias", () => {
    test("should accept a valid alias", () => {
      const result = CreateUrlDto.create({ longUrl: URL, customAlias: "my-link" });
      expect(result[0]).toBeUndefined();
      expect(result[1]?.custom_alias).toBe("my-link");
    });

    test("should ignore an empty alias", () => {
      const result = CreateUrlDto.create({ longUrl: URL, customAlias: "" });
      expect(result[0]).toBeUndefined();
      expect(result[1]?.custom_alias).toBeUndefined();
    });

    test("should leave the alias rule to the verdict", () => {
      const result = CreateUrlDto.create({ longUrl: URL, customAlias: "bad alias" });
      expect(result[0]).toBeUndefined();
      expect(result[1]?.custom_alias).toBe("bad alias");
    });

    test("should reject a non string alias", () => {
      const result = CreateUrlDto.create({ longUrl: URL, customAlias: 42 });
      expect(result[0]).toBe("Custom alias must be a string");
      expect(result[1]).toBeUndefined();
    });
  });

  describe("expiration", () => {
    test("should accept a future expiration date", () => {
      const expiresAt = new Date(Date.now() + 60_000).toISOString();
      const result = CreateUrlDto.create({ longUrl: URL, expiresAt });
      expect(result[0]).toBeUndefined();
      expect(result[1]?.expires_at).toBeInstanceOf(Date);
    });

    test("should reject a past expiration date", () => {
      const expiresAt = new Date(Date.now() - 60_000).toISOString();
      const result = CreateUrlDto.create({ longUrl: URL, expiresAt });
      expect(result[0]).toBe("Expiration date must be in the future");
      expect(result[1]).toBeUndefined();
    });

    test("should reject an invalid expiration date", () => {
      const result = CreateUrlDto.create({ longUrl: URL, expiresAt: "not-a-date" });
      expect(result[0]).toBe("Expiration date must be a valid ISO date");
      expect(result[1]).toBeUndefined();
    });

    test("should reject a non string expiration date", () => {
      const result = CreateUrlDto.create({ longUrl: URL, expiresAt: 123 });
      expect(result[0]).toBe("Expiration date must be a valid ISO date");
      expect(result[1]).toBeUndefined();
    });
  });

  describe("max clicks", () => {
    test("should accept a positive integer", () => {
      const result = CreateUrlDto.create({ longUrl: URL, maxClicks: 1 });
      expect(result[0]).toBeUndefined();
      expect(result[1]?.max_clicks).toBe(1);
    });

    test("should parse numeric strings", () => {
      const result = CreateUrlDto.create({ longUrl: URL, maxClicks: "5" });
      expect(result[0]).toBeUndefined();
      expect(result[1]?.max_clicks).toBe(5);
    });

    test("should reject zero and negative values", () => {
      expect(CreateUrlDto.create({ longUrl: URL, maxClicks: 0 })[0]).toBe(
        "Max clicks must be a positive integer",
      );
      expect(CreateUrlDto.create({ longUrl: URL, maxClicks: -3 })[0]).toBe(
        "Max clicks must be a positive integer",
      );
    });

    test("should reject non integer values", () => {
      expect(CreateUrlDto.create({ longUrl: URL, maxClicks: 1.5 })[0]).toBe(
        "Max clicks must be a positive integer",
      );
      expect(CreateUrlDto.create({ longUrl: URL, maxClicks: "abc" })[0]).toBe(
        "Max clicks must be a positive integer",
      );
    });
  });
});
