#!/usr/bin/env bash
# Tear down the verify instance started by launch.sh. Leaves artifacts/ in place.
set -euo pipefail
# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

stop_pid() {
  local pid=${1:-}
  [[ -n "$pid" ]] || return 0
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      kill -0 "$pid" 2>/dev/null || return 0
      sleep 0.1
    done
    kill -9 "$pid" 2>/dev/null || true
  fi
}

if ! latest_meta >/dev/null || [[ ! -f "$(latest_meta)" ]]; then
  echo "verify-bjurl: nothing to clean up"
  exit 0
fi

resolve_run

stop_pid "${BACKEND_PID:-}"
stop_pid "${VITE_PID:-}"
if [[ -n "${CONTAINER:-}" ]]; then
  docker stop "$CONTAINER" >/dev/null 2>&1 || true
fi

rm -rf "$RUN_DIR"
echo "verify-bjurl: cleaned run $VERIFY_RUN_ID (artifacts kept)"
