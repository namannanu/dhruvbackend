#!/bin/bash

# Test the job details endpoint with team access

BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTJhZWJhN2RmNDdhYzU1ZDY1YTBhZiIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc1OTcwNzUwNiwiZXhwIjoxNzYwMzEyMzA2fQ.IchXJi5XVeDBziGSk2gFIdfcsWoz0E0xuj7dZMYnxhs"
JOB_ID="68e2ec8aacb76ebec3d8ceb0"

echo "=== Testing Job Details with Team Access ==="
echo "Job ID: $JOB_ID"
echo "Your Access: TeamAccess with canViewJobs=true"
echo ""

echo "Getting job details..."

curl -X GET "${BASE_URL}/jobs/${JOB_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

echo -e "\nExpected: Should now work since business ID will be extracted from the job"