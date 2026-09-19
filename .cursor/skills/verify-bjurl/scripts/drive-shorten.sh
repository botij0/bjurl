#!/usr/bin/env bash
# Drive the shorten + redirect path over HTTP. Writes proof under artifacts/shorten-url/.
set -euo pipefail
# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_cmd curl python3
resolve_run

ART="$ARTIFACTS_DIR/shorten-url"
mkdir -p "$ART"

LONG_URL="https://example.com/verify-${VERIFY_RUN_ID}-$(date +%s)"

curl -sf "$API_ORIGIN/api/stats" >"$ART/global-before.json"

curl -sS -D "$ART/create.headers" -o "$ART/create.json" \
  -w '%{http_code}' \
  -X POST "$API_ORIGIN/api/url" \
  -H 'Content-Type: application/json' \
  -d "{\"longUrl\":\"$LONG_URL\"}" >"$ART/create.status"

python3 - "$ART" "$LONG_URL" "$API_ORIGIN" <<'PY'
import json, pathlib, sys
art = pathlib.Path(sys.argv[1])
long_url = sys.argv[2]
origin = sys.argv[3]
status = (art / "create.status").read_text().strip()
assert status == "201", status
body = json.loads((art / "create.json").read_text())
assert body["originalUrl"] == long_url, body
assert body["shortUrl"].startswith(origin + "/"), body
assert body.get("customAlias") is False
code = body["shortUrl"].rsplit("/", 1)[-1]
assert code, body
(art / "code.txt").write_text(code)
(art / "short-url.txt").write_text(body["shortUrl"])
print(code)
PY

SHORT_URL=$(cat "$ART/short-url.txt")
CODE=$(cat "$ART/code.txt")

curl -sS -D "$ART/redirect.headers" -o "$ART/redirect.body" \
  --max-redirs 0 \
  "$SHORT_URL" || true

python3 - "$ART" "$LONG_URL" <<'PY'
import pathlib, sys
art = pathlib.Path(sys.argv[1])
long_url = sys.argv[2]
headers = (art / "redirect.headers").read_text().splitlines()
status = headers[0]
assert "302" in status, status
location = next(line.split(":", 1)[1].strip() for line in headers if line.lower().startswith("location:"))
assert location == long_url, location
PY

curl -sf "$API_ORIGIN/api/url/${CODE}/stats" >"$ART/link-stats.json"
curl -sf "$API_ORIGIN/api/stats" >"$ART/global-after.json"

python3 - "$ART" "$LONG_URL" "$CODE" <<'PY'
import json, pathlib, sys
art = pathlib.Path(sys.argv[1])
long_url = sys.argv[2]
code = sys.argv[3]
before = json.loads((art / "global-before.json").read_text())
after = json.loads((art / "global-after.json").read_text())
stats = json.loads((art / "link-stats.json").read_text())
assert after["urls"] == before["urls"] + 1, (before, after)
assert after["clicks"] == before["clicks"] + 1, (before, after)
assert stats["shortUrl"] == code
assert stats["originalUrl"] == long_url
assert stats["totalClicks"] >= 1, stats
print("ok")
PY

echo "verify-bjurl: shorten proof at $ART"
echo "LONG_URL=$LONG_URL"
echo "SHORT_URL=$SHORT_URL"
echo "CODE=$CODE"
