#!/bin/bash

# Test job creation with the specific business ID we found

BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTJhZWJhN2RmNDdhYzU1ZDY1YTBhZiIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc1OTY5ODg4NCwiZXhwIjoxNzYwMzAzNjg0fQ.EPC6HMHunGh0wlGx45Yk2BI3xAnPPm1XmaPsAzHP1W8"
BUSINESS_ID="68e2a895077beb8cafcadbdb"

echo "=== Testing Job Creation with Specific Business ==="
echo "Business ID: $BUSINESS_ID"
echo "Business Owner: 68e2603ede0927c265035a3a (p@example.com)"
echo "Your ID: 68e2aeba7df47ac55d65a0af (John Doe)"
echo "Access: allBusinesses = true for p@example.com"
echo ""

echo "Creating job for ABC Construction Company..."

curl -X POST "${BASE_URL}/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d "{
    \"title\": \"Morning Shift Barista\",
    \"description\": \"Prepare espresso drinks and support front-of-house team.\",
    \"hourlyRate\": 22,
    \"urgency\": \"medium\",
    \"tags\": [\"barista\", \"coffee\"],
    \"schedule\": {
      \"startDate\": \"2025-09-25T08:00:00.000Z\",
      \"endDate\": \"2025-10-25T12:00:00.000Z\",
      \"startTime\": \"08:00\",
      \"endTime\": \"12:00\",
      \"recurrence\": \"weekly\",
      \"workDays\": [\"monday\", \"wednesday\", \"friday\"]
    },
    \"location\": {
      \"address\": \"123 Market St\",
      \"city\": \"San Francisco\",
      \"state\": \"CA\",
      \"postalCode\": \"94105\",
      \"latitude\": 37.7936,
      \"longitude\": -122.3965
    },
    \"verificationRequired\": false,
    \"businessId\": \"$BUSINESS_ID\"
  }" | jq .

echo -e "\n=== Check server console for debug output ==="