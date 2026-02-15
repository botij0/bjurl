import { envs } from "./envs";

describe("envs.ts", () => {
  test("should return env options", () => {
    expect(envs).toEqual({
      PORT: 3333,
      POSTGRES_URL: "postgresql://postgres:123456@localhost:5432/URL-TEST",
      BASE_URL: "https://test.com",
      PUBLIC_PATH: "public",
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
});
