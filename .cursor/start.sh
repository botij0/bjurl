#!/usr/bin/env bash
# Per-boot startup for the bjurl Cloud Agent environment.
# Brings PostgreSQL online, ensures the app databases exist and applies
# pending Prisma migrations. Idempotent and safe to re-run.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export PATH="$HOME/.bun/bin:$PATH"

echo "==> Starting PostgreSQL cluster"
sudo pg_ctlcluster 16 main start 2>/dev/null || true

echo "==> Waiting for PostgreSQL to accept connections"
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then
    break
  fi
  sleep 1
done

echo "==> Ensuring postgres role password"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '123456';"

echo "==> Ensuring application databases"
for DB in URL URL-TEST; do
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB}'" | grep -q 1; then
    sudo -u postgres createdb "$DB"
  fi
done

echo "==> Applying database migrations"
(cd backend && bunx prisma migrate deploy)
(cd backend && POSTGRES_URL="postgresql://postgres:123456@localhost:5432/URL-TEST" bunx prisma migrate deploy)

echo "==> start.sh complete"
