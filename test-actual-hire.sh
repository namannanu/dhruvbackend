#!/bin/bash

# Test the specific hiring case with your data

BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTJhZWJhN2RmNDdhYzU1ZDY1YTBhZiIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc1OTY5ODg4NCwiZXhwIjoxNzYwMzAzNjg0fQ.EPC6HMHunGh0wlGx45Yk2BI3xAnPPm1XmaPsAzHP1W8"
APPLICATION_ID="68e2fce6420d361f395849f9"
BUSINESS_ID="68e2a895077beb8cafcadbdb"

echo "=== Testing Specific Hiring Case ==="
echo "Application ID: $APPLICATION_ID"
echo "Business ID: $BUSINESS_ID"
echo "Worker: John Doe (w@gmail.com)"
echo "Job: Morning Shift Barista"
echo ""

echo "Attempting to hire worker..."

curl -X POST "${BASE_URL}/employers/me/applications/${APPLICATION_ID}/hire" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d "{
    \"businessId\": \"$BUSINESS_ID\"
  }" | jq .

echo -e "\n=== Check server console for hire_workers permission debug info ==="