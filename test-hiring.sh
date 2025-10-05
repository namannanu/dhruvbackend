#!/bin/bash

# Test hiring functionality with team access

BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTJhZWJhN2RmNDdhYzU1ZDY1YTBhZiIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc1OTY5ODg4NCwiZXhwIjoxNzYwMzAzNjg0fQ.EPC6HMHunGh0wlGx45Yk2BI3xAnPPm1XmaPsAzHP1W8"

echo "=== Testing Hiring with Team Access ==="
echo "User: John Doe (68e2aeba7df47ac55d65a0af)"
echo "Business: 68e2ec8aacb76ebec3d8ceb0"
echo "Permission: canHireWorkers = true"
echo ""

# You'll need to replace APPLICATION_ID with an actual application ID
APPLICATION_ID="REPLACE_WITH_ACTUAL_APPLICATION_ID"

echo "1. Testing hire worker endpoint..."
echo "Note: Replace APPLICATION_ID with an actual application ID"

curl -X POST "${BASE_URL}/employers/me/applications/${APPLICATION_ID}/hire" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "businessId": "68e2ec8aacb76ebec3d8ceb0"
  }' | jq .

echo -e "\n2. Let's also test job creation to make sure that still works..."

curl -X POST "${BASE_URL}/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "title": "Test Job After Permission Fix",
    "description": "Testing job creation after fixing permissions",
    "hourlyRate": 25,
    "urgency": "medium",
    "businessId": "68e2a895077beb8cafcadbdb"
  }' | jq .

echo -e "\n=== Instructions ==="
echo "1. Replace APPLICATION_ID with an actual application ID"
echo "2. Check server logs for permission debugging info"
echo "3. The hire functionality should now work with your team access"