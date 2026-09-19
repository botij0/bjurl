# Custom alias

Custom alias lets a user pick the slug in a short URL, see whether that slug is free, and get the same refusal words the availability check uses when it is not.

## Sub-features

- `alias-check` reports live availability while the user types.
- `alias-create` creates a link whose path is the chosen slug.
- `alias-taken` refuses a slug that already exists (`reason: taken`).
- `alias-reserved` refuses reserved names such as `stats` without hitting the store.
- `alias-invalid` refuses slugs that fail the alias rules (too short, spaces).

## How to get to it (user POV)

- On `/`, choose `Options`, then the `Custom alias` field (`id=custom-alias`).
- `GET /api/alias/:alias/available`.
- `POST /api/url` with `{ "longUrl": "...", "customAlias": "<slug>" }`.

## Driving it with verify-bjurl

Preconditions:

- Doctor is green.
- The slug `verifyalias` is unused on this run's database.

- **Available.** Run `curl -sf "$API_ORIGIN/api/alias/verifyalias/available"`. Body is `{"available":true,"reason":null}`.
- **Reserved.** Run `curl -sf "$API_ORIGIN/api/alias/stats/available"`. Body is `{"available":false,"reason":"reserved"}`.
- **Invalid.** Run `curl -sf "$API_ORIGIN/api/alias/ab/available"`. Body is `{"available":false,"reason":"invalid"}`.
- **Create.** Run `curl -sS -o /tmp/alias-create.json -w '%{http_code}' -X POST "$API_ORIGIN/api/url" -H 'Content-Type: application/json' -d '{"longUrl":"https://example.com/alias","customAlias":"verifyalias"}'`. Status `201`. JSON `shortUrl` ends with `/verifyalias` and `customAlias` is `true`.
- **Taken.** Repeat the create with the same alias. Status `409` and body `{"reason":"taken"}`. `GET /api/alias/verifyalias/available` is `{"available":false,"reason":"taken"}`.
- **UI check.** On `UI_ORIGIN/`, choose `Options`, type `stats` into `Custom alias`. The hint becomes the reserved message (not a network spinner that never settles). Choosing `Shorten` with a valid long URL still shows `role=alert` with that reserved wording and does not 201.
- **Proof.** Save the 201 body and the 409 body under `artifacts/custom-alias/`. Follow `GET $API_ORIGIN/verifyalias` and require `Location: https://example.com/alias`.

## Gotchas

- Create refusals for alias rules return `{reason}` without `{error}`. Assert `reason`.
- Reserved names never call `findUnique`. A test that only mocks the store can pass while this path is broken.
- Availability debounce lives in the UI (`useAliasCheck`). Wait for `Alias is available` / the error string, not a fixed sleep.
- `/links` is reserved as a client path. Using it as an alias is refused; a hard load of `/links` must still serve the SPA, not a 404 JSON body.
