# bjurl — domain model

The words this codebase uses. Architecture words (module, interface, seam, adapter) are not
defined here; this file names the domain.

## Link

A persisted short-URL record: one long URL, an optional identifier (short code or alias), a
click counter, an optional expiry, and an optional click limit. Stored in the `url` table;
`expires_at` and `max_clicks` are independently optional.

## Short code

The identifier the system generates for a link: base62 of the link's row id, with a four
hex-character suffix appended on collision, retried up to three times. Unique by construction,
so a collision can only come from an alias that looks like a generated code. Stored in
`url.short_url` together with aliases. The candidate list is the url module's policy; making one
stick atomically is the link store's (`backend/src/data/link-store.ts`).

## Alias

An identifier the **user** chooses instead of the generated short code. A link created with an
alias has `custom_alias = true`. Shares the `url.short_url` column with short codes, which is
why uniqueness is one constraint over both.

## Alias rule

An alias must be 3–30 characters of letters, numbers, hyphens or underscores, and must not be
reserved. Evaluated by `getAliasRejection` in `backend/src/config/aliases.ts`.

## Reserved alias

An alias the app cannot hand out because it would collide with a route the app serves: `api`,
`stats`, `links`, `dashboard`, `admin`, `assets`, `static`, `healthz`, `favicon`, `robots`.
Matched case-insensitively.

## Alias verdict

The answer to "what is this alias's status?" — exactly one of **invalid**, **reserved**,
**taken**, **free**. It is the shared vocabulary across the HTTP seam: the same four words
answer both "is this alias available?" (`GET /api/alias/:alias/available`) and "why was this
alias refused?" (`POST /api/url`). User-facing wording for a verdict is owned by the frontend;
the backend answers with the verdict alone.

## Click

One resolution of a link, recorded with referrer, user agent, a salted hash of the IP, and the
country. Stored once, as a `click` row, and every count a user sees reads it: the per-link total,
the breakdowns, the dashboard count, and the global total. Recording is best-effort: it never
fails a resolution, so the log can be short.

## Admission

A resolution the link's expiry and click limit allowed through. Counted in `url.counter`, which
only the click-limit predicate reads. An admission is not a reported click: when writing a click
fails, the admission still counts against the limit but leaves no row behind.

## Link status

The derived state of a link: whether its expiry has passed, whether its click limit is spent, and
whether it is one-time. Owned by one module (`frontend/src/lib/link-status.ts`) so the dashboard,
the stats page and the result card cannot disagree about the same link.

## Link history

The browser-local record of links created from this browser, kept in `localStorage` under
`bjurl:links`, capped at 100 entries. A convenience list, not a source of truth: click counts
in it come from the backend.
