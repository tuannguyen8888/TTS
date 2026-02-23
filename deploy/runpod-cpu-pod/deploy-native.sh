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

# Ensure local services are up before app start.
pg_ctlcluster 14 main start >/dev/null 2>&1 || true
if ! redis-cli -h 127.0.0.1 -p 6379 ping >/dev/null 2>&1; then
  redis-server --bind 127.0.0.1 --port 6379 --daemonize yes
fi

cd "$REPO_PATH/backend"
npm ci
npm run build

cd "$REPO_PATH/dashboard"
npm ci
NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" npm run build

pm2 delete tts-backend >/dev/null 2>&1 || true
pm2 delete tts-dashboard >/dev/null 2>&1 || true

cd "$REPO_PATH/backend"
pm2 start dist/main.js --name tts-backend --cwd "$REPO_PATH/backend" --update-env

cd "$REPO_PATH/dashboard"
PORT=3001 NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  pm2 start npm --name tts-dashboard --cwd "$REPO_PATH/dashboard" -- start -- --hostname 0.0.0.0 --port 3001

pm2 save >/dev/null 2>&1 || true
pm2 status

echo "Deploy complete"
