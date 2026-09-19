-- Backfill mixed-case custom aliases to lowercase so the
-- case-insensitive existence check stays consistent.
-- Only touches user-chosen aliases; generated base62 codes
-- (custom_alias = false) are left alone.
UPDATE "url"
SET "short_url" = LOWER("short_url")
WHERE "custom_alias" = true
  AND "short_url" IS NOT NULL
  AND "short_url" <> LOWER("short_url");
