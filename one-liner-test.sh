curl -X POST "http://localhost:3000/api/v1/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTJhZWJhN2RmNDdhYzU1ZDY1YTBhZiIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc1OTY5ODg4NCwiZXhwIjoxNzYwMzAzNjg0fQ.EPC6HMHunGh0wlGx45Yk2BI3xAnPPm1XmaPsAzHP1W8" \
  -d '{
    "title": "Test Construction Job",
    "description": "Test job for ABC Construction Company",
    "hourlyRate": 25,
    "urgency": "medium",
    "businessId": "68e2a895077beb8cafcadbdb"
  }' | jq .