#!/usr/bin/env bash
# Starts each microservice briefly, curls /health, then stops the process.
# Run from the repository root after `npm install` in each service directory.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

for p in 3001 3002 3003 3004 3005; do
  if lsof -iTCP:"$p" -sTCP:LISTEN -Pn 2>/dev/null | grep -q LISTEN; then
    echo "Port $p is already in use. Stop the other process (or your dev servers), then re-run this script."
    exit 1
  fi
done

echo "==> Verifying /health for local microservices (fixed dev ports)"

check_one() {
  local name="$1"
  local port="$2"
  local cmd="$3"
  echo ""
  echo "-- $name (port $port)"
  bash -c "$cmd" &
  local pid=$!
  sleep 4
  if curl -sS -f "http://127.0.0.1:${port}/health" | head -c 400; then
    echo ""
    echo "OK: $name /health"
  else
    echo "FAIL: $name /health"
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    exit 1
  fi
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
}

check_one "phonics-service" 3001 "cd \"$ROOT/microservices/phonics-service\" && PORT=3001 npm run start"
check_one "comprehension-service" 3002 "cd \"$ROOT/microservices/comprehension-service\" && PORT=3002 npm run dev"
check_one "image-generation-service" 3003 "cd \"$ROOT/microservices/image-generation-service\" && PORT=3003 npm run dev"
check_one "audiobook-service" 3004 "cd \"$ROOT/microservices/audiobook-service\" && PORT=3004 npm run start"
check_one "dashboard-service" 3005 "cd \"$ROOT/microservices/dashboard-service\" && PORT=3005 npm run dev"

echo ""
echo "All microservice /health checks passed."
