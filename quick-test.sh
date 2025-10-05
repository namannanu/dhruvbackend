#!/bin/bash

# Quick test to see what's happening with job creation

BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTJhZWJhN2RmNDdhYzU1ZDY1YTBhZiIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc1OTY5ODg4NCwiZXhwIjoxNzYwMzAzNjg0fQ.EPC6HMHunGh0wlGx45Yk2BI3xAnPPm1XmaPsAzHP1W8"

echo "=== Quick Job Creation Test ==="

# First get any business ID to test with
echo "Getting accessible businesses..."
BUSINESS_RESPONSE=$(curl -s -X GET "${BASE_URL}/jobs/access-context" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

echo "Access context response:"
echo "$BUSINESS_RESPONSE" | jq .

# Extract a business ID if available
BUSINESS_ID=$(echo "$BUSINESS_RESPONSE" | jq -r '.data.accessibleBusinesses[0].businessId // .data.accessibleBusinesses[0].id // .data.accessibleBusinesses[0]._id // empty')

if [ -z "$BUSINESS_ID" ] || [ "$BUSINESS_ID" == "null" ]; then
    echo "No business ID found in access context. Let's try getting all businesses..."
    ALL_BUSINESSES=$(curl -s -X GET "${BASE_URL}/businesses" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${AUTH_TOKEN}")
    
    echo "All businesses response:"
    echo "$ALL_BUSINESSES" | jq '.data[0:3]'  # Show first 3 businesses
    
    BUSINESS_ID=$(echo "$ALL_BUSINESSES" | jq -r '.data[0]._id // .data[0].id // empty')
fi

echo -e "\nUsing business ID: $BUSINESS_ID"

if [ -z "$BUSINESS_ID" ] || [ "$BUSINESS_ID" == "null" ]; then
    echo "ERROR: No business ID available. Please create a business first."
    exit 1
fi

echo -e "\nAttempting job creation..."
curl -s -X POST "${BASE_URL}/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d "{
    \"title\": \"Test Job\",
    \"description\": \"Test job description\",
    \"hourlyRate\": 20,
    \"urgency\": \"medium\",
    \"businessId\": \"$BUSINESS_ID\"
  }" | jq .

echo -e "\n=== Check server console for debug logs ==="