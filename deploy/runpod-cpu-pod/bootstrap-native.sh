#!/usr/bin/env bash
set -euo pipefail

REPO_PATH="${1:-/workspace/TTS}"
DEPLOY_DIR="$REPO_PATH/deploy"
ENV_FILE="$DEPLOY_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  build-essential \
  python3 \
  make \
  g++ \
  git \
  redis-server \
  postgresql \
  postgresql-client

# Install Node.js 20 if missing or incompatible (Next.js 16 requires modern Node).
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  cat >/etc/apt/sources.list.d/nodesource.list <<'EOF'
deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main
EOF
  apt-get update -y
  apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

# Start/ensure PostgreSQL cluster.
pg_ctlcluster 14 main start >/dev/null 2>&1 || true

# Ensure postgres responds before configuring.
for _ in $(seq 1 20); do
  if su postgres -c "pg_isready -h 127.0.0.1 -p 5432" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
su postgres -c "pg_isready -h 127.0.0.1 -p 5432" >/dev/null

# Configure database/user for app (demo defaults use postgres user).
su postgres -c "psql -v ON_ERROR_STOP=1 <<SQL
ALTER USER ${POSTGRES_USER} WITH PASSWORD '${POSTGRES_PASSWORD}';
SELECT 'CREATE DATABASE ${POSTGRES_DB}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${POSTGRES_DB}')\\gexec
SQL"

# Start Redis if not running.
if ! redis-cli -h 127.0.0.1 -p 6379 ping >/dev/null 2>&1; then
  redis-server --bind 127.0.0.1 --port 6379 --daemonize yes
fi
redis-cli -h 127.0.0.1 -p 6379 ping >/dev/null

echo "Bootstrap complete"
node -v
npm -v
pm2 -v
su postgres -c "pg_isready -h 127.0.0.1 -p 5432"
redis-cli -h 127.0.0.1 -p 6379 ping
