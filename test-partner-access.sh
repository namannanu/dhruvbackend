#!/bin/bash

# Partner Access Testing Script
# This script tests if user jjjgmail.com can operate on partner p@example.com's business data

echo "🧪 Testing Partner Access for jjjgmail.com -> p@example.com"
echo "============================================================="

# Configuration
BASE_URL="{{baseUrl}}"
PARTNER_EMAIL="p@example.com"
JJJ_TOKEN="{{jjjgmail_token}}"  # Replace with actual token for jjjgmail.com user
BUSINESS_ID="{{businessId}}"    # Replace with actual business ID

# Test 1: Verify team access
echo "1️⃣  Testing team access verification..."
curl -X GET "${BASE_URL}/team/check-access/${PARTNER_EMAIL}" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n"

# Test 2: List accessible businesses
echo "2️⃣  Testing business listing..."
curl -X GET "${BASE_URL}/businesses" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n"

# Test 3: Create a new business (test creation permission)
echo "3️⃣  Testing business creation..."
curl -X POST "${BASE_URL}/businesses" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Business via Partner Access",
    "businessType": "Restaurant",
    "businessDescription": "Testing business creation through partner access",
    "businessAddress": {
      "street": "123 Test St",
      "city": "Test City",
      "state": "TS",
      "zipCode": "12345",
      "country": "Test Country"
    },
    "contactInformation": {
      "phoneNumber": "+1234567890",
      "email": "test@business.com"
    }
  }' | jq '.'

echo -e "\n"

# Test 4: Update partner's business
echo "4️⃣  Testing business update..."
curl -X PATCH "${BASE_URL}/businesses/${BUSINESS_ID}" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "businessDescription": "Updated description via partner access"
  }' | jq '.'

echo -e "\n"

# Test 5: List jobs
echo "5️⃣  Testing job listing..."
curl -X GET "${BASE_URL}/jobs" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n"

# Test 6: Create a job
echo "6️⃣  Testing job creation..."
curl -X POST "${BASE_URL}/jobs" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Job via Partner Access",
    "description": "Testing job creation through partner access",
    "businessId": "'${BUSINESS_ID}'",
    "location": {
      "street": "123 Job St",
      "city": "Job City",
      "state": "JS",
      "zipCode": "54321"
    },
    "employmentType": "part_time",
    "payRate": {
      "amount": 15.00,
      "currency": "USD",
      "payPeriod": "hourly"
    },
    "requirements": ["Basic skills", "Reliability"],
    "benefits": ["Flexible schedule"],
    "isActive": true
  }' | jq '.'

echo -e "\n"

# Test 7: View attendance management
echo "7️⃣  Testing attendance management view..."
curl -X GET "${BASE_URL}/attendance/management" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n"

# Test 8: List attendance records
echo "8️⃣  Testing attendance listing..."
curl -X GET "${BASE_URL}/attendance" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n"

# Test 9: Search workers
echo "9️⃣  Testing worker search..."
curl -X GET "${BASE_URL}/attendance/search/workers?name=John" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n"

# Test 10: View team members
echo "🔟 Testing team member listing..."
curl -X GET "${BASE_URL}/businesses/${BUSINESS_ID}/team-members" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n"

# Test 11: Check my access
echo "1️⃣1️⃣ Testing my access view..."
curl -X GET "${BASE_URL}/team/my-access" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n"

# Test 12: Grant access to others (test delegation)
echo "1️⃣2️⃣ Testing access delegation..."
curl -X POST "${BASE_URL}/team/grant-access" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "testuser@example.com",
    "accessLevel": "view_only",
    "accessScope": "business_specific",
    "businessContext": {
      "businessId": "'${BUSINESS_ID}'",
      "allBusinesses": false,
      "canCreateNewBusiness": false,
      "canGrantAccessToOthers": false
    },
    "permissions": {
      "canViewBusiness": true,
      "canViewJobs": true,
      "canViewAttendance": true
    },
    "reason": "Testing delegation of access through partner permissions"
  }' | jq '.'

echo -e "\n============================================================="
echo "✅ All tests completed!"
echo "📋 Check the responses above for success/failure status"
echo "🔍 Look for 200/201 status codes and proper data in responses"