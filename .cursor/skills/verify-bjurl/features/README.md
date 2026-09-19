# bjurl verification map

This directory is the maintained source for verifying user-facing bjurl behavior. Read this index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `.cursor/skills/verify-bjurl/scripts/launch.sh`.
- Run `.cursor/skills/verify-bjurl/scripts/doctor.sh` and require the printed `API_ORIGIN` and `UI_ORIGIN`.
- Drive HTTP against `API_ORIGIN`. Drive the SPA against `UI_ORIGIN` (Vite). Do not use `http://localhost:3334` or a `docker compose` instance this run did not start.
- Never reuse host port 5432. Launch always creates its own Postgres container.
- Start every recipe from the baseline unless its preconditions say otherwise.

## Driving conventions

- Treat every command as literal. Keep quoted names and flags unchanged.
- Prefer HTTP scripts for create, redirect, alias, and stats. Use browser/CDP on `UI_ORIGIN` for form chrome, QR download, and `localStorage`.
- Prefer ARIA names and element ids (`custom-alias`, `expiry`) over CSS or coordinates. The long-URL field has no accessible name; its placeholder is `Paste your long URL here...`.
- Restore fixture aliases after a mutation when the recipe created a chosen alias. Keep proof artifacts.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- HTTP mutation proof includes a second read (`GET /api/url/:code/stats` or `GET /api/stats`).
- UI proof includes an ARIA snapshot or screenshot with the document title `bjurl`.
- Record the feature ID, `VERIFY_RUN_ID`, and entry point with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify-bjurl` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

## Features

- [Shorten a URL](./shorten-url.md) covers create, redirect, and persistence of the new row and click.
- [Custom alias](./custom-alias.md) covers live availability, create with a chosen slug, and taken/reserved/invalid refusals.
- [Link history](./link-history.md) covers the `/links` dashboard and `bjurl:links` in this browser.
- [Per-link stats](./link-stats.md) covers `/stats/:shortUrl` and `GET /api/url/:code/stats` after a click.
- [Global stats](./global-stats.md) covers home `Links Shortened` / `Clicks Tracked` and `GET /api/stats`.
