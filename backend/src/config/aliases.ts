export const ALIAS_REGEX = /^[A-Za-z0-9_-]{3,30}$/;

export const RESERVED_ALIASES = new Set([
  "api",
  "stats",
  "links",
  "dashboard",
  "admin",
  "assets",
  "static",
  "healthz",
  "favicon",
  "robots",
]);

export type AliasVerdict = "invalid" | "reserved" | "taken" | "free";

export const normalizeAlias = (alias: string): string => alias.toLowerCase();

export const getAliasRejection = (
  alias: string,
): Exclude<AliasVerdict, "taken" | "free"> | null => {
  if (!ALIAS_REGEX.test(alias)) return "invalid";
  if (RESERVED_ALIASES.has(alias.toLowerCase())) return "reserved";
  return null;
};

export const getAliasVerdict = (alias: string, inUse: boolean): AliasVerdict => {
  const rejection = getAliasRejection(alias);
  if (rejection) return rejection;
  return inUse ? "taken" : "free";
};
