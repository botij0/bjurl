#!/usr/bin/env bash
# Read-only health check for the current verify-bjurl run.
set -euo pipefail
# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_cmd curl python3 ss
resolve_run

fail() {
  echo "verify-bjurl doctor: $*" >&2
  exit 1
}

pid_alive "$BACKEND_PID" || fail "backend pid $BACKEND_PID is dead"
pid_alive "$VITE_PID" || fail "vite pid $VITE_PID is dead"
docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -qx true || fail "postgres container $CONTAINER is not running"

ss -ltn | grep -qE ":${API_PORT}[[:space:]]" || fail "nothing listening on API port $API_PORT"
ss -ltn | grep -qE ":${UI_PORT}[[:space:]]" || fail "nothing listening on UI port $UI_PORT"

stats=$(curl -sf "$API_ORIGIN/api/stats") || fail "GET $API_ORIGIN/api/stats failed"
python3 - "$stats" <<'PY' || fail "GET /api/stats is not {urls, clicks}"
import json, sys
body = json.loads(sys.argv[1])
assert isinstance(body.get("urls"), int)
assert isinstance(body.get("clicks"), int)
PY

curl -sf "$API_ORIGIN/" | grep -q 'id="root"' || fail "GET $API_ORIGIN/ is not the built SPA (unexpected, API still ok)"
# Built public/ talks to same-origin /api. UI proof still uses Vite.
curl -sf "$UI_ORIGIN/" | grep -q 'id="root"' || fail "GET $UI_ORIGIN/ missing #root"
curl -sf "$UI_ORIGIN/" | grep -q '<title>bjurl</title>' || true

echo "verify-bjurl doctor: ok"
echo "VERIFY_RUN_ID=$VERIFY_RUN_ID"
echo "API_ORIGIN=$API_ORIGIN"
echo "UI_ORIGIN=$UI_ORIGIN"
echo "BACKEND_PID=$BACKEND_PID"
echo "VITE_PID=$VITE_PID"
echo "CONTAINER=$CONTAINER"
echo "$stats"
