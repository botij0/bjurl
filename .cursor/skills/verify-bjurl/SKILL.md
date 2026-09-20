---
name: verify-bjurl
description: >-
  Drives the bjurl URL shortener the way a user does (React SPA plus
  Express `/api` on a live Postgres). Use when proving a feature, checking a
  UI or API change, or when asked to verify, control, or end-to-end test
  bjurl.
---

# Verify bjurl

bjurl is a URL shortener. Users touch the React SPA (`/`, `/links`, `/stats/:shortUrl`). That SPA talks to Express routes under `/api`, and `GET /:shortUrl` 302s to the long URL. This skill launches an isolated instance and drives those paths. Jest/Vitest suites mock the store and do not count as proof.

Read [features/README.md](features/README.md) before driving. Use the matching feature file. One convenient entry point is not coverage when the map lists others.

## Launch

From the repo root:

```bash
.cursor/skills/verify-bjurl/scripts/launch.sh
```

That script starts three processes this run owns:

1. A `postgres:15.3` container on `127.0.0.1:${VERIFY_PG_PORT:-55432}` named `bjurl-verify-$VERIFY_RUN_ID`. It does **not** use `backend/.env` or host port 5432.
2. Express via `cd backend && bun run src/app.ts` on `127.0.0.1:${VERIFY_API_PORT:-3340}` with `BASE_URL=http://127.0.0.1:$API_PORT` and `IP_HASH_SALT=verify-salt-$VERIFY_RUN_ID`. Ready when `GET /api/stats` returns JSON.
3. Vite via `cd frontend && bun run dev -- --host 127.0.0.1 --port ${VERIFY_UI_PORT:-5179} --strictPort` with `VITE_API_URL` pointing at the API origin. Ready when `GET /` contains `id="root"`.

Ready output prints `VERIFY_RUN_ID`, `API_ORIGIN`, and `UI_ORIGIN`. Metadata lives in `.cursor/skills/verify-bjurl/runs/$VERIFY_RUN_ID/meta.env`. Logs are `backend.log` and `vite.log` in that directory.

The copy of `backend/public/` that Express serves talks to same-origin `/api`. Drive the UI at the Vite origin anyway so this run's `VITE_API_URL` can point at `API_ORIGIN` without a rebuild.

Defaults refuse to start when 3340, 5179, or 55432 are bound, or when a previous verify pid is still alive. Override with `VERIFY_API_PORT`, `VERIFY_UI_PORT`, `VERIFY_PG_PORT`, `VERIFY_RUN_ID`.

## Doctor

```bash
.cursor/skills/verify-bjurl/scripts/doctor.sh
```

Run this first whenever anything looks off. It checks the pids from `meta.env` are alive, the Postgres container is running, the API and UI ports are listening, `GET $API_ORIGIN/api/stats` is `{urls, clicks}` integers, and `GET $UI_ORIGIN/` contains `#root`. Never drive an instance this run did not start.

## Drive

Default harness is HTTP against `$API_ORIGIN` (curl via the scripts below). Use the Vite origin plus browser/CDP only for UI-only behavior (form labels, localStorage history, QR download).

Stable handles from this repo:

| User control | Handle |
| --- | --- |
| Long URL field | placeholder `Paste your long URL here...` (no accessible name) |
| Submit | button whose name is `Shorten` |
| Options | button `Options` (`aria-expanded`) |
| Custom alias | textbox `custom-alias` / label `Custom alias` |
| Expiration | combobox `expiry` |
| One-time | checkbox `One-time link (single click)` |
| Copy / open / QR / stats | `aria-label` `Copy short URL`, `Open short URL`, `Toggle QR code`, `View statistics` |
| History | link `My links` → `/links`; empty heading `No links yet` |
| Per-link stats | `/stats/:shortUrl`; heading `Link analytics`; cards `Total clicks`, `Unique visitors` |
| Home stats | text `Links Shortened`, `Clicks Tracked` (hidden while both counts are 0) |

HTTP map (same behaviors the SPA calls):

- `POST /api/url` JSON `{longUrl, customAlias?, expiresAt?, maxClicks?}` → 201 `{originalUrl, shortUrl, expiresAt, maxClicks, customAlias}`
- `GET /:code` → 302 `Location` = long URL; records a click
- `GET /api/url/:code/stats` → 200 link analytics
- `GET /api/stats` → 200 `{urls, clicks}`
- `GET /api/alias/:alias/available` → 200 `{available, reason}`
- `POST /api/url/batch-stats` JSON `{shortUrls}` → 200 `{links}`

```bash
.cursor/skills/verify-bjurl/scripts/drive-shorten.sh
```

Feature files name the exact curl/browser steps and the observable end state. Treat those commands as literal.

## Evidence

Write proof under `.cursor/skills/verify-bjurl/artifacts/<feature-id>/`. Cleanup must not delete that tree.

Proof standards:

- Drive the real Express + Postgres instance. Jest mocks of `prisma` are not proof.
- Capture the action and the resulting state (request + response, then a second read). For shorten that is create JSON, redirect headers, then `GET /api/url/:code/stats` and `GET /api/stats`.
- A 201 alone is not enough. The short URL must 302 to the same `longUrl`, and global `urls`/`clicks` must move.
- UI proof (when the feature is UI-only) includes the Vite origin, an ARIA snapshot or screenshot with the `bjurl` title visible, and any `localStorage["bjurl:links"]` mutation.
- Record `VERIFY_RUN_ID` and the feature id with the artifacts.

## Cleanup

```bash
.cursor/skills/verify-bjurl/scripts/cleanup.sh
```

Sends SIGTERM to the pids in `meta.env` and `docker stop`s that run's container. It does not kill by process name. It removes `runs/$VERIFY_RUN_ID` and leaves `artifacts/` in place.

## Helpers

All scripts are executable. Source `scripts/lib.sh` only from the other scripts.

| Script | Invocation |
| --- | --- |
| Launch | `.cursor/skills/verify-bjurl/scripts/launch.sh` |
| Doctor | `.cursor/skills/verify-bjurl/scripts/doctor.sh` |
| Shorten drive | `.cursor/skills/verify-bjurl/scripts/drive-shorten.sh` |
| Cleanup | `.cursor/skills/verify-bjurl/scripts/cleanup.sh` |

`VERIFY_RUN_ID` selects a run. Without it, scripts use the newest `runs/*/meta.env`.
