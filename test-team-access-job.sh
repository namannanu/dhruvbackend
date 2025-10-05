#!/bin/bash

# Test job creation with team access for user ID: 68e2aeba7df47ac55d65a0af

BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTJhZWJhN2RmNDdhYzU1ZDY1YTBhZiIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc1OTY5ODg4NCwiZXhwIjoxNzYwMzAzNjg0fQ.EPC6HMHunGh0wlGx45Yk2BI3xAnPPm1XmaPsAzHP1W8"

echo "=== Testing Team Access Job Creation ==="
echo "User ID: 68e2aeba7df47ac55d65a0af"
echo "Role: employer"
echo ""

echo "1. First, let's check accessible businesses for this user..."
curl -X GET "${BASE_URL}/jobs/access-context" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

echo -e "\n\n2. Let's also list existing businesses to see what's available..."
curl -X GET "${BASE_URL}/businesses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

echo -e "\n\n3. Now let's try to create a job with a business ID..."
echo "Note: Replace BUSINESS_ID_HERE with an actual business ID from the list above"

curl -X POST "${BASE_URL}/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "title": "Morning Shift Barista",
    "description": "Prepare espresso drinks and support front-of-house team.",
    "hourlyRate": 22,
    "urgency": "medium",
    "tags": ["barista", "coffee"],
    "schedule": {
      "startDate": "2025-09-25T08:00:00.000Z",
      "endDate": "2025-10-25T12:00:00.000Z",
      "startTime": "08:00",
      "endTime": "12:00",
      "recurrence": "weekly",
      "workDays": ["monday", "wednesday", "friday"]
    },
    "location": {
      "address": "123 Market St",
      "city": "San Francisco",
      "state": "CA",
      "postalCode": "94105",
      "latitude": 37.7936,
      "longitude": -122.3965
    },
    "verificationRequired": false,
    "businessId": "BUSINESS_ID_HERE"
  }' | jq .

echo -e "\n\n=== Instructions ==="
echo "1. Run this script to see accessible businesses"
echo "2. Replace 'BUSINESS_ID_HERE' with an actual business ID"
echo "3. Re-run the job creation request"
echo ""
echo "If you're still getting team access errors, we may need to:"
echo "- Check if TeamAccess records exist for your user"
echo "- Verify the business ID you're trying to use"
echo "- Ensure your TeamAccess record has canCreateJobs permission"