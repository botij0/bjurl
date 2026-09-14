import { ALIAS_ERROR_MESSAGES, RESERVED_ALIASES, getAliasRejection } from "./aliases";

describe("aliases", () => {
  describe("getAliasRejection", () => {
    test("should accept valid aliases", () => {
      expect(getAliasRejection("abc")).toBeNull();
      expect(getAliasRejection("my-link")).toBeNull();
      expect(getAliasRejection("promo_2026")).toBeNull();
      expect(getAliasRejection("A1b2C3")).toBeNull();
      expect(getAliasRejection("a".repeat(30))).toBeNull();
    });

    test("should reject aliases with invalid format", () => {
      expect(getAliasRejection("ab")).toBe("invalid");
      expect(getAliasRejection("a".repeat(31))).toBe("invalid");
      expect(getAliasRejection("hello world")).toBe("invalid");
      expect(getAliasRejection("dot.alias")).toBe("invalid");
      expect(getAliasRejection("slash/alias")).toBe("invalid");
    });

    test("should reject reserved aliases regardless of case", () => {
      for (const alias of RESERVED_ALIASES) {
        expect(getAliasRejection(alias.toUpperCase())).toBe("reserved");
      }
    });
  });

  describe("ALIAS_ERROR_MESSAGES", () => {
    test("should have a message per rejection reason", () => {
      expect(ALIAS_ERROR_MESSAGES.invalid).toBeDefined();
      expect(ALIAS_ERROR_MESSAGES.reserved).toBeDefined();
      expect(ALIAS_ERROR_MESSAGES.taken).toBeDefined();
    });
  });
});
