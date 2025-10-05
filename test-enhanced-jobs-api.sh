#!/bin/bash

# Enhanced Jobs API Test Script
# This script demonstrates the improved transparency and context information

echo "🎯 Enhanced Jobs API with Business Context"
echo "==========================================="

# Configuration
BASE_URL="{{baseUrl}}"
P_TOKEN="{{p_token}}"      # Token for p@example.com
JJJ_TOKEN="{{jjj_token}}"  # Token for jjjgmail.com

echo "📋 Testing Scenarios:"
echo "  1. p@example.com (business owner)"
echo "  2. jjjgmail.com (partner with access)"
echo ""

# Test 1: p@example.com - Check access context
echo "1️⃣  p@example.com - Check job access context"
echo "Expected: Should show owned business(es)"
curl -s -X GET "${BASE_URL}/jobs/access-context" \
  -H "Authorization: Bearer ${P_TOKEN}" \
  -H "Content-Type: application/json" | jq '{
    accessSource: .data.accessSource,
    message: .data.message,
    businessCount: (.data.accessibleBusinesses | length),
    businesses: [.data.accessibleBusinesses[] | {
      businessName: .businessName,
      isOwned: .owner.isCurrentUser,
      jobCount: .jobCount
    }]
  }'

echo -e "\n================================================\n"

# Test 2: p@example.com - List jobs
echo "2️⃣  p@example.com - List jobs"
echo "Expected: Jobs from owned business(es)"
curl -s -X GET "${BASE_URL}/jobs" \
  -H "Authorization: Bearer ${P_TOKEN}" \
  -H "Content-Type: application/json" | jq '{
    status: .status,
    results: .results,
    accessSource: .accessContext.accessSource,
    jobsFrom: .accessContext.jobsFrom,
    accessibleBusinessCount: (.accessContext.accessibleBusinesses | length),
    jobsSummary: .accessContext.jobsSummary
  }'

echo -e "\n================================================\n"

# Test 3: jjjgmail.com - Check access context
echo "3️⃣  jjjgmail.com - Check job access context"
echo "Expected: Should show partner business access through TeamAccess"
curl -s -X GET "${BASE_URL}/jobs/access-context" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" | jq '{
    accessSource: .data.accessSource,
    message: .data.message,
    businessCount: (.data.accessibleBusinesses | length),
    businesses: [.data.accessibleBusinesses[] | {
      businessName: .businessName,
      owner: .owner.email,
      isOwned: .owner.isCurrentUser,
      jobCount: .jobCount
    }]
  }'

echo -e "\n================================================\n"

# Test 4: jjjgmail.com - List jobs
echo "4️⃣  jjjgmail.com - List jobs"
echo "Expected: Jobs from partner business(es) with full context"
curl -s -X GET "${BASE_URL}/jobs" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" | jq '{
    status: .status,
    results: .results,
    accessSource: .accessContext.accessSource,
    message: .accessContext.message,
    jobsFrom: .accessContext.jobsFrom,
    accessibleBusinessCount: (.accessContext.accessibleBusinesses | length),
    jobsSummary: .accessContext.jobsSummary,
    businessDetails: [.accessContext.accessibleBusinesses[] | {
      businessName: .businessName,
      owner: .owner.email,
      isOwned: .owner.isCurrentUser
    }]
  }'

echo -e "\n================================================\n"

# Test 5: jjjgmail.com - Try accessing specific business
echo "5️⃣  jjjgmail.com - Access specific business (if business ID available)"
echo "Expected: Clear indication of access rights to specific business"
echo "Note: Replace BUSINESS_ID with actual business ID to test"
# curl -s -X GET "${BASE_URL}/jobs?businessId=BUSINESS_ID" \
#   -H "Authorization: Bearer ${JJJ_TOKEN}" \
#   -H "Content-Type: application/json" | jq '.accessContext'

echo -e "\n================================================"
echo "🎯 Summary of Enhancements:"
echo "   ✅ Clear access context in all responses"
echo "   ✅ Business ownership information"
echo "   ✅ Job counts per business"
echo "   ✅ Access source identification"
echo "   ✅ Specific error messages for access issues"
echo "   ✅ Dedicated access-context endpoint"
echo ""
echo "📱 Usage:"
echo "   GET /jobs/access-context - Check what businesses user can access"
echo "   GET /jobs - List jobs with full context information"
echo "   GET /jobs?businessId=X - Access specific business with validation"