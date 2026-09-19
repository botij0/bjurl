#!/usr/bin/env bash
# Shared paths and run-state helpers for verify-bjurl. Source this file; do not execute it.

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SKILL_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
ROOT=$(cd "$SKILL_DIR/../../.." && pwd)
RUNS_DIR="$SKILL_DIR/runs"
ARTIFACTS_DIR="$SKILL_DIR/artifacts"

require_cmd() {
  local cmd
  for cmd in "$@"; do
    command -v "$cmd" >/dev/null || {
      echo "verify-bjurl: missing command: $cmd" >&2
      exit 1
    }
  done
}

latest_meta() {
  ls -1dt "$RUNS_DIR"/*/meta.env 2>/dev/null | head -1 || true
}

resolve_run() {
  local meta
  if [[ -n "${VERIFY_RUN_ID:-}" ]]; then
    meta="$RUNS_DIR/$VERIFY_RUN_ID/meta.env"
  else
    meta=$(latest_meta)
  fi
  if [[ -z "$meta" || ! -f "$meta" ]]; then
    echo "verify-bjurl: no run metadata. Launch first." >&2
    exit 1
  fi
  # shellcheck disable=SC1090
  source "$meta"
  RUN_DIR="$RUNS_DIR/$VERIFY_RUN_ID"
}

pid_alive() {
  local pid=${1:-}
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}
