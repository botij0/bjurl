import { RESERVED_ALIASES, getAliasVerdict } from "./aliases";

describe("aliases", () => {
  describe("getAliasVerdict", () => {
    test("should call a valid free alias free", () => {
      expect(getAliasVerdict("abc", false)).toBe("free");
      expect(getAliasVerdict("my-link", false)).toBe("free");
      expect(getAliasVerdict("promo_2026", false)).toBe("free");
      expect(getAliasVerdict("A1b2C3", false)).toBe("free");
      expect(getAliasVerdict("a".repeat(30), false)).toBe("free");
    });

    test("should reject aliases with invalid format", () => {
      expect(getAliasVerdict("ab", true)).toBe("invalid");
      expect(getAliasVerdict("a".repeat(31), true)).toBe("invalid");
      expect(getAliasVerdict("hello world", true)).toBe("invalid");
      expect(getAliasVerdict("dot.alias", true)).toBe("invalid");
      expect(getAliasVerdict("slash/alias", true)).toBe("invalid");
    });

    test("should reject reserved aliases regardless of case", () => {
      for (const alias of RESERVED_ALIASES) {
        expect(getAliasVerdict(alias.toUpperCase(), true)).toBe("reserved");
      }
    });

    test("should call an in-use alias taken", () => {
      expect(getAliasVerdict("promo", true)).toBe("taken");
    });

    test("should keep the rule ahead of use, so a reserved alias is never taken", () => {
      expect(getAliasVerdict("api", true)).toBe("reserved");
      expect(getAliasVerdict("ab", true)).toBe("invalid");
    });
  });
});
