#!/usr/bin/env bash
# Start an isolated bjurl verify instance: Postgres container, Express API, Vite UI.
set -euo pipefail
# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_cmd bun curl docker python3 ss

if [[ -n "$(latest_meta)" ]]; then
  # shellcheck disable=SC1090
  source "$(latest_meta)"
  if pid_alive "${BACKEND_PID:-}" || pid_alive "${VITE_PID:-}"; then
    echo "verify-bjurl: a verify run is already live (VERIFY_RUN_ID=$VERIFY_RUN_ID). Cleanup first." >&2
    exit 1
  fi
fi

VERIFY_RUN_ID=${VERIFY_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$$}
API_PORT=${VERIFY_API_PORT:-3340}
UI_PORT=${VERIFY_UI_PORT:-5179}
PG_PORT=${VERIFY_PG_PORT:-55432}
CONTAINER="bjurl-verify-$VERIFY_RUN_ID"

for port in "$API_PORT" "$UI_PORT" "$PG_PORT"; do
  if ss -ltn | grep -qE ":${port}[[:space:]]"; then
    echo "verify-bjurl: port $port is already bound. Pick another VERIFY_*_PORT." >&2
    exit 1
  fi
done

RUN_DIR="$RUNS_DIR/$VERIFY_RUN_ID"
mkdir -p "$RUN_DIR" "$ARTIFACTS_DIR"

POSTGRES_URL="postgresql://postgres:verify@127.0.0.1:${PG_PORT}/URL"
API_ORIGIN="http://127.0.0.1:${API_PORT}"
UI_ORIGIN="http://127.0.0.1:${UI_PORT}"

cleanup_partial() {
  if [[ -f "$RUN_DIR/backend.pid" ]]; then
    kill "$(cat "$RUN_DIR/backend.pid")" 2>/dev/null || true
  fi
  if [[ -f "$RUN_DIR/vite.pid" ]]; then
    kill "$(cat "$RUN_DIR/vite.pid")" 2>/dev/null || true
  fi
  docker stop "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup_partial ERR

docker run -d --rm \
  --name "$CONTAINER" \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=verify \
  -e POSTGRES_DB=URL \
  -p "127.0.0.1:${PG_PORT}:5432" \
  postgres:15.3 >/dev/null

for _ in $(seq 1 40); do
  if docker exec "$CONTAINER" pg_isready -U postgres -d URL >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done
docker exec "$CONTAINER" pg_isready -U postgres -d URL >/dev/null

(
  cd "$ROOT/backend"
  POSTGRES_URL="$POSTGRES_URL" bunx prisma migrate deploy >/dev/null
)

: >"$RUN_DIR/backend.log"
: >"$RUN_DIR/vite.log"

(
  cd "$ROOT/backend"
  export PORT="$API_PORT" PUBLIC_PATH=public BASE_URL="$API_ORIGIN" POSTGRES_URL IP_HASH_SALT="verify-salt-$VERIFY_RUN_ID"
  exec setsid bun run src/app.ts >>"$RUN_DIR/backend.log" 2>&1
) </dev/null &
echo $! >"$RUN_DIR/backend.pid"

(
  cd "$ROOT/frontend"
  export VITE_API_URL="$API_ORIGIN"
  exec setsid bun run dev -- --host 127.0.0.1 --port "$UI_PORT" --strictPort >>"$RUN_DIR/vite.log" 2>&1
) </dev/null &
echo $! >"$RUN_DIR/vite.pid"

api_ready=0
for _ in $(seq 1 60); do
  if curl -sf "$API_ORIGIN/api/stats" >/dev/null; then
    api_ready=1
    break
  fi
  sleep 0.25
done
if [[ "$api_ready" -ne 1 ]]; then
  echo "verify-bjurl: API did not answer /api/stats. See $RUN_DIR/backend.log" >&2
  exit 1
fi

ui_ready=0
for _ in $(seq 1 60); do
  if curl -sf "$UI_ORIGIN/" | grep -q 'id="root"'; then
    ui_ready=1
    break
  fi
  sleep 0.25
done
if [[ "$ui_ready" -ne 1 ]]; then
  echo "verify-bjurl: Vite UI did not serve #root. See $RUN_DIR/vite.log" >&2
  exit 1
fi

cat >"$RUN_DIR/meta.env" <<EOF
VERIFY_RUN_ID=$VERIFY_RUN_ID
API_PORT=$API_PORT
UI_PORT=$UI_PORT
PG_PORT=$PG_PORT
API_ORIGIN=$API_ORIGIN
UI_ORIGIN=$UI_ORIGIN
POSTGRES_URL=$POSTGRES_URL
CONTAINER=$CONTAINER
BACKEND_PID=$(cat "$RUN_DIR/backend.pid")
VITE_PID=$(cat "$RUN_DIR/vite.pid")
EOF

echo "verify-bjurl: ready"
echo "VERIFY_RUN_ID=$VERIFY_RUN_ID"
echo "API_ORIGIN=$API_ORIGIN"
echo "UI_ORIGIN=$UI_ORIGIN"
