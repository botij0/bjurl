# Per-link stats

Per-link stats show clicks, unique visitors, and breakdowns for one short code on `/stats/:shortUrl`.

## Sub-features

- `stats-open` opens analytics from the result card, from `/links`, or by visiting `/stats/:code`.
- `stats-empty` shows zero clicks and empty breakdown copy before anyone follows the link.
- `stats-after-click` increments `Total clicks` after a 302 through `GET /:code`.
- `stats-missing` shows not-found for an unknown code.

## How to get to it (user POV)

- After shortening, choose `View statistics` (chart icon).
- From `/links`, choose `View statistics` on a row.
- Open `/stats/<code>`.
- `GET /api/url/<code>/stats`.

## Driving it with verify-bjurl

Preconditions:

- Doctor is green.
- A short code exists. Create one with `.cursor/skills/verify-bjurl/scripts/drive-shorten.sh` or `POST /api/url` without following the 302 if you need a zero-click baseline.

- **Missing.** Run `curl -sS -o /tmp/stats-missing.json -w '%{http_code}' "$API_ORIGIN/api/url/no-such-code/stats"`. Status `404`. Body `{"error":"Url no-such-code not found"}`.
- **After click.** If you used `drive-shorten.sh`, `artifacts/shorten-url/link-stats.json` already has `totalClicks` ≥ 1, `originalUrl` equal to `LONG_URL`, and `shortUrl` equal to `CODE`. `clicksByDay` has at least one bucket.
- **Zero click (optional).** `POST /api/url` then `GET /api/url/<code>/stats` *before* `GET /<code>`. `totalClicks` is 0. `clicksByDay` is `[]`.
- **UI.** Open `$UI_ORIGIN/stats/<code>`. Heading `Link analytics` is visible. Cards `Total clicks` and `Unique visitors` match the JSON. Empty chart copy is `No clicks yet — share your link to see data here.` only when `clicksByDay` is empty.
- **Proof.** Save `GET /api/url/<code>/stats` JSON under `artifacts/link-stats/`. For UI, screenshot the analytics heading with the short link visible.

## Gotchas

- `drive-shorten.sh` follows the redirect, so it cannot prove the zero-click empty chart by itself. Create without GET to prove `stats-empty`.
- Unique visitors are distinct `ip_hash` values. A single curl from one IP increments clicks and unique visitors together.
- The SPA route is `/stats/:shortUrl`. `GET /stats` without a code is not this page (reserved alias / SPA).
- Batch counts on `/links` use `POST /api/url/batch-stats`. That is a summary. Full breakdowns only exist on this page and `GET /api/url/:code/stats`.
