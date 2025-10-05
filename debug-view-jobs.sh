#!/bin/bash

# Debug the view_jobs permission specifically

BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTJhZWJhN2RmNDdhYzU1ZDY1YTBhZiIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc1OTcwNzUwNiwiZXhwIjoxNzYwMzEyMzA2fQ.IchXJi5XVeDBziGSk2gFIdfcsWoz0E0xuj7dZMYnxhs"
JOB_ID="68e2ec8aacb76ebec3d8ceb0"

echo "=== Debug view_jobs Permission Issue ==="
echo "Job ID: $JOB_ID"
echo ""

echo "1. First, let's check your team access permissions:"
curl -s -X GET "${BASE_URL}/team/check-access" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq '.data.permissions.canViewJobs'

echo -e "\n2. Now let's try to get job details and check server logs:"
curl -X GET "${BASE_URL}/jobs/${JOB_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

echo -e "\n=== Check server console for debug output ==="
echo "Look for:"
echo "- 'TeamAccess permissions object:'"
echo "- 'Specific view_jobs permission:'"
echo "- 'canViewJobs: true/false'"