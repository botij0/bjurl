# Link history

Link history shows links created from this browser on `/links`, with live click counts, and stores them only in `localStorage` under `bjurl:links`.

## Sub-features

- `history-empty` shows `No links yet` when storage is empty.
- `history-add` appends a row after a successful shorten in this browser.
- `history-counts` fills the Clicks column from `POST /api/url/batch-stats`.
- `history-remove` removes one row (`Remove from history`) without deleting the server link.
- `history-clear` empties storage via `Clear history`.

## How to get to it (user POV)

- Choose `My links` on `/`.
- Open `/links` directly.
- After shortening on `/`, the same browser's `/links` list includes that short URL.

## Driving it with verify-bjurl

Preconditions:

- Doctor is green.
- The Vite origin is a fresh profile, or `localStorage["bjurl:links"]` has been cleared for this proof.

- **Empty state.** Open `$UI_ORIGIN/links`. Heading `My links` is visible. Heading `No links yet` and button `Shorten a link` are visible. `localStorage.getItem("bjurl:links")` is null or `[]`.
- **Add.** On `$UI_ORIGIN/`, shorten `https://example.com/history-proof`. Open `/links`. The list contains that long URL and the new short URL. `localStorage["bjurl:links"]` is JSON whose first entry has those two fields and `createdAt`.
- **Counts.** After `GET` the short URL once (302), reload `/links`. The `Clicks` figure for that row is at least 1, not `—`.
- **Remove.** Choose `Remove from history` on that row. The row disappears. `GET $API_ORIGIN/api/url/<code>/stats` still 200 (server row remains).
- **Clear.** Shorten a second link, then choose `Clear history`. The empty state returns. `localStorage["bjurl:links"]` is gone.
- **Proof.** Screenshot `$UI_ORIGIN/links` populated, plus a dump of `localStorage["bjurl:links"]`, under `artifacts/link-history/`. HTTP-only create does not write this storage; skipping the UI entry is `verified-unreachable` for `history-add`.

## Gotchas

- History is per origin. Proof on `UI_ORIGIN` is invisible on `API_ORIGIN`.
- `POST /api/url/batch-stats` failing shows `Could not load click counts` and leaves figures as last known / `—`. That is not an empty list.
- Remove and clear do not call a delete API. Assert the server stats endpoint still finds the code.
- Hard refresh of `/links` must render the SPA. If it returns `{"error":...}` the greedy `/:shortUrl` route is shadowing the client path.
