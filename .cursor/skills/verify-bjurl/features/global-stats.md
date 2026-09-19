# Global stats

Global stats show how many links and clicks exist on this instance, on the home page and at `GET /api/stats`.

## Sub-features

- `global-json` returns `{urls, clicks}` integers.
- `global-home` renders `Links Shortened` and `Clicks Tracked` on `/` when both counts are above zero.
- `global-increment` moves both numbers after a create plus a redirect.

## How to get to it (user POV)

- Open `/` and read the figures under the form.
- `GET /api/stats`.

## Driving it with verify-bjurl

Preconditions:

- Doctor is green.

- **JSON.** Run `curl -sf "$API_ORIGIN/api/stats"`. Body keys `urls` and `clicks` are integers.
- **Increment.** Run `.cursor/skills/verify-bjurl/scripts/drive-shorten.sh`. `artifacts/shorten-url/global-after.json` `urls` is `global-before.json` `urls` plus 1. `clicks` is plus 1.
- **Home hidden.** On a fresh isolated database before any create, `$UI_ORIGIN/` does not show `Links Shortened`. That is expected (`StatsBar` requires `urls > 0`).
- **Home visible.** After at least one create and one click, reload `$UI_ORIGIN/`. Text `Links Shortened` and `Clicks Tracked` appear and match `GET /api/stats`.
- **Proof.** Keep the before/after JSON from `drive-shorten.sh` under `artifacts/shorten-url/` (or copy to `artifacts/global-stats/`). For UI, screenshot home with both labels visible.

## Gotchas

- `StatsBar` hides the whole bar when `urls` is 0, even if you expected a zero. Do not treat a missing bar as a failed fetch.
- `GET /api/stats` 500 with `{error:"Something went wrong getting stats"}` means the store read failed. Doctor already required a 200.
- Counts are instance-wide, not per browser. Isolated Postgres keeps them from mixing with a developer's docker stack.
