#!/usr/bin/env bash
set -euo pipefail

REPO_PATH="${1:-/workspace/TTS}"
BRANCH="${2:-main}"
DEPLOY_DIR="$REPO_PATH/deploy"
ENV_FILE="$DEPLOY_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

cd "$REPO_PATH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

# Runpod CPU Pod images often ship an nginx proxy that reserves public-facing
# ports (e.g. 3001->3000, 8001->8000, 8081->8080). Run app processes on the
# upstream ports to avoid collisions with nginx itself.
BACKEND_INTERNAL_PORT="${BACKEND_INTERNAL_PORT:-8000}"
DASHBOARD_INTERNAL_PORT="${DASHBOARD_INTERNAL_PORT:-8080}"

# The demo .env is compose-oriented (postgres/redis hostnames). Native deploy
# runs all services in a single pod, so force local loopback URLs.
DATABASE_URL="${DATABASE_URL//@postgres:/@127.0.0.1:}"
DATABASE_URL="${DATABASE_URL//@postgres\//@127.0.0.1/}"
REDIS_URL="${REDIS_URL//redis:\/\//redis:\/\/127.0.0.1:}"
REDIS_URL="${REDIS_URL//redis:\/\/redis\//redis:\/\/127.0.0.1/}"
export DATABASE_URL REDIS_URL

npm_install_cmd() {
  local dir="$1"
  cd "$dir"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
}

# Ensure local services are up before app start.
pg_ctlcluster 14 main start >/dev/null 2>&1 || true
if ! redis-cli -h 127.0.0.1 -p 6379 ping >/dev/null 2>&1; then
  redis-server --bind 127.0.0.1 --port 6379 --daemonize yes
fi

cd "$REPO_PATH/backend"
npm_install_cmd "$REPO_PATH/backend"
npm run build

cd "$REPO_PATH/dashboard"
npm_install_cmd "$REPO_PATH/dashboard"
NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" npm run build

pm2 delete tts-backend >/dev/null 2>&1 || true
pm2 delete tts-dashboard >/dev/null 2>&1 || true

cd "$REPO_PATH/backend"
PORT="$BACKEND_INTERNAL_PORT" \
  pm2 start dist/main.js --name tts-backend --cwd "$REPO_PATH/backend" --update-env

cd "$REPO_PATH/dashboard"
PORT="$DASHBOARD_INTERNAL_PORT" NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  pm2 start npm --name tts-dashboard --cwd "$REPO_PATH/dashboard" -- start -- --hostname 0.0.0.0 --port "$DASHBOARD_INTERNAL_PORT"

pm2 save >/dev/null 2>&1 || true
pm2 status

echo "Deploy complete"
