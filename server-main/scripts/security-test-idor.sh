#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"

echo "1) Login user A..."
A_TOKEN=$(curl -sS -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"userA","password":"UserA!234"}' | node -e 'process.stdin.on("data",d=>{const j=JSON.parse(d);console.log(j.data?.accessToken||"")})')

echo "2) Try to access secret id=2 (assumed user B)..."
HTTP_CODE=$(curl -sS -o /tmp/idor_resp.json -w "%{http_code}" \
  -H "Authorization: Bearer $A_TOKEN" \
  "$BASE_URL/secrets/2")

echo "HTTP status for unauthorized resource: $HTTP_CODE"
cat /tmp/idor_resp.json
