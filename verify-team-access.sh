#!/bin/bash

# Team Access Verification Script
# This script demonstrates the difference between correct and incorrect email usage

echo "🔍 Team Access Email Verification Test"
echo "====================================="

# Configuration
BASE_URL="{{baseUrl}}"
JJJ_TOKEN="{{jjjgmail_token}}"  # Replace with actual token for jjjgmail.com user

echo "📋 Current Team Access Setup:"
echo "   • jjjgmail.com (has access)"
echo "   • p@example.com (target user - CORRECT)"
echo "   • p@gmail.com (wrong email - INCORRECT)"
echo ""

# Test 1: Check access to CORRECT email (should succeed)
echo "✅ Test 1: Check access to p@example.com (CORRECT)"
echo "Expected: Should show access granted with admin permissions"
curl -s -X GET "${BASE_URL}/team/check-access/p@example.com" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n================================================\n"

# Test 2: Check access to WRONG email (should fail)
echo "❌ Test 2: Check access to p@gmail.com (WRONG - different domain)"
echo "Expected: Should return 'No team access records found'"
curl -s -X GET "${BASE_URL}/team/check-access/p@gmail.com" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n================================================\n"

# Test 3: Check my access records (shows all granted access)
echo "📝 Test 3: View all my access records"
echo "Expected: Should show access record for p@example.com"
curl -s -X GET "${BASE_URL}/team/my-access" \
  -H "Authorization: Bearer ${JJJ_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n================================================"
echo "🎯 Summary:"
echo "   ✅ p@example.com - Should have access (granted)"
echo "   ❌ p@gmail.com - Should have NO access (wrong email)"
echo "   📋 my-access - Shows all granted access records"