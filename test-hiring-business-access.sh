#!/bin/bash

# Test the hiring functionality with business access fix

BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTJhZWJhN2RmNDdhYzU1ZDY1YTBhZiIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc1OTcwNzUwNiwiZXhwIjoxNzYwMzEyMzA2fQ.IchXJi5XVeDBziGSk2gFIdfcsWoz0E0xuj7dZMYnxhs"
APPLICATION_ID="68e2fce6420d361f395849f9"
BUSINESS_ID="68e2a895077beb8cafcadbdb"

echo "=== Testing Hiring with Business Access Check ==="
echo "Application ID: $APPLICATION_ID"
echo "Business ID: $BUSINESS_ID"
echo "Job Owner: p@example.com (68e2603ede0927c265035a3a)"
echo "Your Access: TeamAccess with allBusinesses=true for p@example.com"
echo ""

echo "Attempting to hire worker with proper business access check..."

curl -X POST "${BASE_URL}/employers/me/applications/${APPLICATION_ID}/hire" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d "{
    \"businessId\": \"$BUSINESS_ID\"
  }" | jq .

echo -e "\nExpected: Should now work since you have TeamAccess with hire_workers permission for this business"