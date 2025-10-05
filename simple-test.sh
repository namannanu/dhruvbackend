#!/bin/bash

# Simple test to check what businesses the user has access to

BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTJhZWJhN2RmNDdhYzU1ZDY1YTBhZiIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc1OTY5ODg4NCwiZXhwIjoxNzYwMzAzNjg0fQ.EPC6HMHunGh0wlGx45Yk2BI3xAnPPm1XmaPsAzHP1W8"

echo "=== Simple Business Access Test ==="
echo "User ID: 68e2aeba7df47ac55d65a0af"
echo ""

# Just try to get accessible businesses first
echo "1. Getting accessible businesses via jobs endpoint..."
curl -s -X GET "${BASE_URL}/jobs/access-context" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

echo -e "\n2. Getting all businesses to see what exists..."
curl -s -X GET "${BASE_URL}/businesses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq '.data | length'

echo -e "\n3. Trying to create a job without specifying business (should give us a clearer error)..."
curl -s -X POST "${BASE_URL}/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "title": "Test Job",
    "description": "Test description",
    "hourlyRate": 20
  }' | jq .