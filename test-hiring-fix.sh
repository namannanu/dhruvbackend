#!/bin/bash

# Test the hiring fix

BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTJhZWJhN2RmNDdhYzU1ZDY1YTBhZiIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc1OTY5ODg4NCwiZXhwIjoxNzYwMzAzNjg0fQ.EPC6HMHunGh0wlGx45Yk2BI3xAnPPm1XmaPsAzHP1W8"
APPLICATION_ID="68e2fce6420d361f395849f9"
BUSINESS_ID="68e2a895077beb8cafcadbdb"

echo "=== Testing Fixed Hiring Functionality ==="
echo "Application ID: $APPLICATION_ID"
echo "Business ID: $BUSINESS_ID"
echo ""

echo "Attempting to hire worker with fixed permission mapping..."

curl -X POST "${BASE_URL}/employers/me/applications/${APPLICATION_ID}/hire" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d "{
    \"businessId\": \"$BUSINESS_ID\"
  }" | jq .

echo -e "\nExpected: Permission check should pass, may get other validation errors but NOT permission errors"