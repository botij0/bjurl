# Shorten a URL

Shorten a URL lets a user turn an http(s) long URL into a short link, open that short link, and land on the original address.

## Sub-features

- `shorten-create` creates a short link from the home form or `POST /api/url`.
- `shorten-redirect` follows the short link with a 302 to the long URL and records a click.
- `shorten-result` shows the short URL, original URL, copy, open, QR, and stats actions on the home page.
- `shorten-reject` refuses a missing or invalid long URL without creating a row.

## How to get to it (user POV)

- Open `/` and use the field `Paste your long URL here...` plus the `Shorten` button.
- Press Enter in that field.
- `POST /api/url` with JSON `{ "longUrl": "<https url>" }`.
- Visit the `shortUrl` returned in the 201 body (or `GET /:code` on `API_ORIGIN`).

## Driving it with verify-bjurl

Preconditions:

- Doctor reports a healthy `API_ORIGIN` and `UI_ORIGIN`.
- Isolated Postgres from this run (empty `urls` is fine).

- **Create via HTTP.** Run `.cursor/skills/verify-bjurl/scripts/drive-shorten.sh`. Exit 0. `artifacts/shorten-url/create.status` is `201`. `create.json` has `originalUrl` equal to the script's `LONG_URL` and `shortUrl` under `API_ORIGIN`.
- **Redirect.** The same script writes `redirect.headers`. The status line contains `302` and `Location` equals `LONG_URL`.
- **Persistence.** `artifacts/shorten-url/link-stats.json` has `totalClicks` ≥ 1 and the same `originalUrl`. `global-after.json` `urls` and `clicks` are each one higher than `global-before.json`.
- **Create via UI.** On `UI_ORIGIN/`, fill the placeholder `Paste your long URL here...` with `https://example.com/ui-shorten` and choose `Shorten`. A result region appears containing that long URL as `Original URl:` (the label is spelled that way) and a short link whose host is `API_ORIGIN`.
- **Reject empty.** Choose `Shorten` with an empty field. A `role=alert` reads `Please enter a URL.` `GET /api/stats` `urls` is unchanged.
- **Proof.** Keep `artifacts/shorten-url/` after cleanup. The directory must still contain `create.json`, `redirect.headers`, `link-stats.json`, and both global snapshots.

## Gotchas

- Use `UI_ORIGIN` for UI steps. Vite is started with `VITE_API_URL=$API_ORIGIN` so the form talks to this run, not a leftover local server.
- `drive-shorten.sh` already issues the 302, so `totalClicks` is at least 1 afterward. Do not expect 0.
- Home `Links Shortened` stays hidden while `urls` is 0. Prove the first create from JSON or from the result card, not from that bar.
- Client-side `isValidUrl` only checks `new URL()`. The API also requires http/https once that allowlist is on the branch you are verifying.
