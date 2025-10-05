#!/bin/bash

# Quick test for hiring with your specific business ID

BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTJhZWJhN2RmNDdhYzU1ZDY1YTBhZiIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc1OTY5ODg4NCwiZXhwIjoxNzYwMzAzNjg0fQ.EPC6HMHunGh0wlGx45Yk2BI3xAnPPm1XmaPsAzHP1W8"
BUSINESS_ID="68e2ec8aacb76ebec3d8ceb0"

echo "=== Quick Hiring Permission Test ==="
echo "Business ID: $BUSINESS_ID"
echo "Testing with placeholder application ID (will fail on application not found, but should pass permission check)"
echo ""

curl -X POST "${BASE_URL}/employers/me/applications/PLACEHOLDER_APPLICATION_ID/hire" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d "{
    \"businessId\": \"$BUSINESS_ID\"
  }" | jq .

echo -e "\nExpected: Should get 'Application not found' or similar, NOT 'Insufficient permissions'"