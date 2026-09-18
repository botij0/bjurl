import { envs } from "./envs";

jest.mock("dotenv/config");

describe("envs.ts", () => {
  const originalIpHashSalt = process.env.IP_HASH_SALT;
  const originalPort = process.env.PORT;

  afterEach(() => {
    process.env.IP_HASH_SALT = originalIpHashSalt;
    process.env.PORT = originalPort;
  });

  test("should return env options", () => {
    expect(envs).toEqual({
      PORT: 3333,
      POSTGRES_URL: "postgresql://postgres:123456@localhost:5432/URL-TEST",
      BASE_URL: "https://test.com",
      PUBLIC_PATH: "public",
      IP_HASH_SALT: "test-salt",
    });
  });

  test("should return error if invalid env", async () => {
    jest.resetModules();
    process.env.PORT = "ABC";

    try {
      await import("./envs");
      expect(true).toBe(false);
    } catch (error) {
      expect(`${error}`).toContain('"PORT" should be a valid integer');
    }
  });

  test.each(["change_me", "bjurl", "REPLACE_WITH_RANDOM_SECRET"])(
    "should reject the placeholder IP_HASH_SALT %s",
    async (placeholder) => {
      jest.resetModules();
      process.env.IP_HASH_SALT = placeholder;

      await expect(import("./envs")).rejects.toThrow(
        '"IP_HASH_SALT" must be a random secret',
      );
    },
  );

  test("should reject a missing IP_HASH_SALT", async () => {
    jest.resetModules();
    delete process.env.IP_HASH_SALT;

    await expect(import("./envs")).rejects.toThrow(
      '"IP_HASH_SALT" is a required variable, but it was not set',
    );
  });

  test("should reject an empty IP_HASH_SALT", async () => {
    jest.resetModules();
    process.env.IP_HASH_SALT = "";

    await expect(import("./envs")).rejects.toThrow(
      '"IP_HASH_SALT" is a required variable, but its value was empty',
    );
  });
});
