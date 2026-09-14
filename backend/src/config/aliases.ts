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

export type AliasRejection = "invalid" | "reserved" | "taken";

export const ALIAS_ERROR_MESSAGES: Record<AliasRejection, string> = {
  invalid:
    "Alias must be 3-30 characters using letters, numbers, hyphens or underscores",
  reserved: "This alias is reserved",
  taken: "This alias is already in use",
};

export const getAliasRejection = (alias: string): AliasRejection | null => {
  if (!ALIAS_REGEX.test(alias)) return "invalid";
  if (RESERVED_ALIASES.has(alias.toLowerCase())) return "reserved";
  return null;
};
