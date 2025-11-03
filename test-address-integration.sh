#!/bin/bash

# Simple test script for business address integration
# Run this after starting your server

echo "🚀 Testing Business Address Integration"
echo "====================================="

# Configuration
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDM2YTBkYjFhN2NmYWIzYzRjY2JiZCIsInJvbGUiOiJ3b3JrZXIiLCJpYXQiOjE3NjIxNzQ1OTEsImV4cCI6MTc2Mjc3OTM5MX0.unofecb4qZ-qe4SzskAoWOrfeTNZ8y4O1QraUJcICE0"
BASE_URL="http://localhost:3000/api"

echo ""
echo "1. 🏢 Fetching available businesses..."
BUSINESSES=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/businesses")
echo "$BUSINESSES" | jq -r '.data[] | "Business: \(.name) | ID: \(._id) | Location: \(.location.city // "No city"), \(.location.state // "No state")"'

# Get first business ID
BUSINESS_ID=$(echo "$BUSINESSES" | jq -r '.data[0]._id // empty')

if [ -z "$BUSINESS_ID" ]; then
  echo "❌ No businesses found. Please create a business first."
  exit 1
fi

echo ""
echo "2. 📍 Getting business address for job creation..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/businesses/$BUSINESS_ID/address" | jq '.'

echo ""
echo "3. 📝 Creating job without location (should inherit business address)..."
JOB_DATA='{
  "title": "Test Auto-Address Job",
  "description": "This job should automatically get the business address",
  "hourlyRate": 25,
  "business": "'$BUSINESS_ID'",
  "schedule": {
    "startDate": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
    "endDate": "'$(date -u -d "+7 days" +"%Y-%m-%dT%H:%M:%S.000Z")'",
    "startTime": "09:00",
    "endTime": "17:00",
    "workDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  },
  "tags": ["test", "auto-address"],
  "urgency": "medium"
}'

JOB_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$JOB_DATA" "$BASE_URL/jobs")
echo "$JOB_RESPONSE" | jq '.'

# Get created job ID
JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.data._id // empty')

if [ -z "$JOB_ID" ]; then
  echo "❌ Failed to create job"
  exit 1
fi

echo ""
echo "4. 🔍 Fetching created job to verify address..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/jobs/$JOB_ID" | jq '.data | {title: .title, location: .location, business: .business}'

echo ""
echo "5. 📋 Listing recent jobs with location data..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/jobs" | jq '.data[0:3] | .[] | {title: .title, location: .location, business: .business.name}'

echo ""
echo "✅ Test completed! Check the output above to verify:"
echo "   - Business address was fetched correctly"
echo "   - Job was created with business address"
echo "   - Job listing shows location data"