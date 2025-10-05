#!/bin/bash

# Quick database check for TeamAccess records

BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTJhZWJhN2RmNDdhYzU1ZDY1YTBhZiIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc1OTY5ODg4NCwiZXhwIjoxNzYwMzAzNjg0fQ.EPC6HMHunGh0wlGx45Yk2BI3xAnPPm1XmaPsAzHP1W8"

echo "=== Checking Team Access for User: 68e2aeba7df47ac55d65a0af ==="

echo "1. Checking all team access records..."
curl -X GET "${BASE_URL}/team/check-access" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

echo -e "\n\n2. Checking businesses owned by user..."
curl -X GET "${BASE_URL}/businesses?owner=true" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

echo -e "\n\n3. Getting user profile info..."
curl -X GET "${BASE_URL}/users/me" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .