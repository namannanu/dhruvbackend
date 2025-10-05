#!/bin/bash

# Test job creation with businessId field

BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="your_jwt_token_here"

echo "Testing job creation with businessId field..."

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
    "businessId": "REPLACE_WITH_ACTUAL_BUSINESS_ID"
  }' | jq .

echo -e "\n\nTesting job creation with business field (alternative)..."

curl -X POST "${BASE_URL}/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "title": "Evening Shift Server",
    "description": "Serve customers and maintain dining area.",
    "hourlyRate": 18,
    "urgency": "low",
    "tags": ["server", "hospitality"],
    "schedule": {
      "startDate": "2025-09-25T17:00:00.000Z",
      "endDate": "2025-10-25T22:00:00.000Z",
      "startTime": "17:00",
      "endTime": "22:00",
      "recurrence": "daily",
      "workDays": ["monday", "tuesday", "wednesday", "thursday", "friday"]
    },
    "location": {
      "address": "123 Market St",
      "city": "San Francisco",
      "state": "CA",
      "postalCode": "94105",
      "latitude": 37.7936,
      "longitude": -122.3965
    },
    "verificationRequired": true,
    "business": "REPLACE_WITH_ACTUAL_BUSINESS_ID"
  }' | jq .

echo -e "\n\nTesting job creation without business field (should fail)..."

curl -X POST "${BASE_URL}/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "title": "Test Job Without Business",
    "description": "This should fail.",
    "hourlyRate": 20,
    "urgency": "medium"
  }' | jq .