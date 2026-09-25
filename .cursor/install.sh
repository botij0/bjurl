#!/usr/bin/env bash
# Idempotent repository bootstrap for the bjurl Cloud Agent environment.
# Installs system dependencies (PostgreSQL, Bun), project dependencies,
# generates the Prisma client and validates the frontend build.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Installing system packages (PostgreSQL)"
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib
fi

echo "==> Installing Bun"
if ! command -v bun >/dev/null 2>&1; then
  curl -fsSL https://bun.sh/install | bash
fi
# Make bun available on PATH for every shell (install, start, terminals).
if [ -x "$HOME/.bun/bin/bun" ] && [ ! -e /usr/local/bin/bun ]; then
  sudo ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun
  sudo ln -sf "$HOME/.bun/bin/bunx" /usr/local/bin/bunx
fi
export PATH="$HOME/.bun/bin:$PATH"

echo "==> Writing backend/.env"
cat > backend/.env <<'EOF'
PORT=3334
PUBLIC_PATH=public
BASE_URL=http://localhost:3334
POSTGRES_URL=postgresql://postgres:123456@localhost:5432/URL
POSTGRES_USER=postgres
POSTGRES_DB=URL
POSTGRES_PORT=5432
POSTGRES_PASSWORD=123456
IP_HASH_SALT=local-dev-salt
EOF

echo "==> Writing frontend/.env"
cat > frontend/.env <<'EOF'
VITE_API_URL=http://localhost:3334
PROD=false
EOF

echo "==> Installing backend dependencies"
(cd backend && bun install --frozen-lockfile)

echo "==> Generating Prisma client"
(cd backend && bunx prisma generate)

echo "==> Installing frontend dependencies"
(cd frontend && bun install --frozen-lockfile)

echo "==> Validating frontend build"
(cd frontend && bun run build)

echo "==> install.sh complete"
