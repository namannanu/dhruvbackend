#!/bin/bash

# Test job creation with proper business handling for team access user

BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTJhZWJhN2RmNDdhYzU1ZDY1YTBhZiIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc1OTY5ODg4NCwiZXhwIjoxNzYwMzAzNjg0fQ.EPC6HMHunGh0wlGx45Yk2BI3xAnPPm1XmaPsAzHP1W8"

echo "=== Testing Job Creation for Team Access User ==="
echo "User: John Doe (68e2aeba7df47ac55d65a0af)"
echo "Managed User: papa papaa (p@example.com)"
echo "Access: allBusinesses = true"
echo ""

echo "1. Getting businesses accessible to the managed user (p@example.com)..."
echo "   Since you have access to 'allBusinesses', we need to find businesses owned by the managed user"

# First, let's get all businesses to find ones owned by the managed user
curl -s -X GET "${BASE_URL}/businesses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq '.data[] | select(.owner == "68e2603ede0927c265035a3a") | {id: ._id, name: .businessName, owner: .owner}' > managed_user_businesses.json

echo "Businesses owned by managed user (p@example.com):"
cat managed_user_businesses.json | jq .

# Get the first business ID
BUSINESS_ID=$(cat managed_user_businesses.json | jq -r '._id // .id' | head -1)

echo -e "\nUsing business ID: $BUSINESS_ID"

if [ "$BUSINESS_ID" == "null" ] || [ -z "$BUSINESS_ID" ]; then
    echo "No businesses found for managed user. Let's create one first..."
    
    echo -e "\n2. Creating a business for the managed user..."
    curl -s -X POST "${BASE_URL}/businesses" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -d '{
        "businessName": "Test Coffee Shop",
        "businessType": "restaurant",
        "description": "A cozy coffee shop",
        "address": {
          "street": "123 Main St",
          "city": "San Francisco",
          "state": "CA",
          "postalCode": "94105"
        }
      }' | jq .
      
    # Get the business ID from the response
    echo "Please run this script again after the business is created."
    exit 1
fi

echo -e "\n3. Now attempting to create a job for business: $BUSINESS_ID"

curl -s -X POST "${BASE_URL}/jobs" \
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

# Clean up
rm -f managed_user_businesses.json

echo -e "\n=== Check server logs for detailed debug information ==="