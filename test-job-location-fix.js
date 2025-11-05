const jobWithLocation = {
  "title": "Test Dishwasher",
  "description": "Test job with location",
  "hourlyRate": 52,
  "business": "69095408d6fba1c634662e7b", // Your business ID
  "location": {
    "type": "Point",
    "coordinates": [75.8647527, 25.2138156], // [longitude, latitude]
    "address": {
      "line1": "3 Mahaveer Nagar III Circle",
      "city": "Kota",
      "state": "Rajasthan",
      "country": "India",
      "postalCode": "324005",
      "formattedAddress": "3 Mahaveer Nagar III Circle, Mahaveer Nagar, Kota, Rajasthan 324005, India"
    }
  },
  "schedule": {
    "startDate": new Date("2025-11-05T00:30:00.000Z"),
    "endDate": new Date("2025-11-05T01:45:00.000Z"),
    "startTime": "00:30",
    "endTime": "01:45",
    "recurrence": "one-time"
  },
  "overtime": {
    "allowed": false,
    "rateMultiplier": 0.015
  },
  "urgency": "medium",
  "tags": ["dishwasher"],
  "verificationRequired": false,
  "premiumRequired": false,
  "status": "active"
};

// You can test this using your create job API endpoint:
// POST /api/jobs
// With the above object as the request body