#!/usr/bin/env bash
# Exercise operational + feature endpoints for local microservices (ports 3001–3005).
# Frees those ports first, starts each service, curls, then stops the service.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

for p in 3001 3002 3003 3004 3005; do
  lsof -ti tcp:"$p" -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
done

log() { echo "[verify] $*"; }

run_phonics() {
  log "phonics-service :3001"
  ( cd "$ROOT/microservices/phonics-service" && PORT=3001 npm run start ) &
  local pid=$!
  sleep 4
  curl -sS "http://127.0.0.1:3001/health" | head -c 200; echo
  curl -sS "http://127.0.0.1:3001/live" | head -c 200; echo
  curl -sS "http://127.0.0.1:3001/meta" | head -c 200; echo
  curl -sS "http://127.0.0.1:3001/ready" | head -c 200; echo
  curl -sS -X POST "http://127.0.0.1:3001/process" \
    -H "Content-Type: application/json" \
    -d '{"storyId":"verify-t1","storyText":"The cat sat."}' | head -c 400; echo
  curl -sS "http://127.0.0.1:3001/story/verify-t1" | head -c 200; echo
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
}

run_comprehension() {
  log "comprehension-service :3002"
  ( cd "$ROOT/microservices/comprehension-service" && PORT=3002 npm run dev ) &
  local pid=$!
  sleep 4
  curl -sS "http://127.0.0.1:3002/health" | head -c 200; echo
  curl -sS "http://127.0.0.1:3002/live" | head -c 200; echo
  curl -sS "http://127.0.0.1:3002/meta" | head -c 200; echo
  curl -sS "http://127.0.0.1:3002/ready" | head -c 200; echo
  curl -sS -X POST "http://127.0.0.1:3002/comprehension/questions" \
    -H "Content-Type: application/json" \
    -H "x-readon-user-id: verify-user" \
    -d '{"sourceText":"Short passage for verify.","questionCount":2,"difficulty":"easy"}' | head -c 500; echo
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
}

run_image() {
  log "image-generation-service :3003"
  ( cd "$ROOT/microservices/image-generation-service" && PORT=3003 npm run dev ) &
  local pid=$!
  sleep 4
  curl -sS "http://127.0.0.1:3003/health" | head -c 300; echo
  curl -sS "http://127.0.0.1:3003/live" | head -c 200; echo
  curl -sS "http://127.0.0.1:3003/meta" | head -c 200; echo
  curl -sS "http://127.0.0.1:3003/ready" | head -c 300; echo
  curl -sS -X POST "http://127.0.0.1:3003/images/generate" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"a red ball","numImages":1}' | head -c 400; echo
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
}

run_audiobook() {
  log "audiobook-service :3004"
  ( cd "$ROOT/microservices/audiobook-service" && PORT=3004 npm run start ) &
  local pid=$!
  sleep 4
  curl -sS "http://127.0.0.1:3004/health" | head -c 200; echo
  curl -sS "http://127.0.0.1:3004/live" | head -c 200; echo
  curl -sS "http://127.0.0.1:3004/meta" | head -c 200; echo
  curl -sS "http://127.0.0.1:3004/ready" | head -c 200; echo
  curl -sS -X POST "http://127.0.0.1:3004/tts" \
    -H "Content-Type: application/json" \
    -d '{"text":"Hello verify."}' -o /tmp/ab_verify.mp3 -w "\nhttp_code=%{http_code} content_type=%{content_type}\n"
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
}

run_dashboard() {
  log "dashboard-service :3005"
  ( cd "$ROOT/microservices/dashboard-service" && PORT=3005 npm run dev ) &
  local pid=$!
  sleep 4
  curl -sS "http://127.0.0.1:3005/health" | head -c 200; echo
  curl -sS "http://127.0.0.1:3005/live" | head -c 200; echo
  curl -sS "http://127.0.0.1:3005/meta" | head -c 400; echo
  curl -sS "http://127.0.0.1:3005/ready" | head -c 200; echo
  curl -sS "http://127.0.0.1:3005/history/visualization?limit=2" | head -c 400; echo
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
}

run_phonics
run_comprehension
run_image
run_audiobook
run_dashboard

log "done (per-service). Start main app separately for BFF tests: npm run dev"
