// Test script for the new dynamic availability system
// Run this after starting the server: node test-availability.js

const availabilityTestData = {
  // Test case 1: Full-time worker
  fullTime: {
    "availability": [
      {
        "day": "monday",
        "isAvailable": true,
        "timeSlots": [{"startTime": "09:00", "endTime": "17:00"}]
      },
      {
        "day": "tuesday",
        "isAvailable": true,
        "timeSlots": [{"startTime": "09:00", "endTime": "17:00"}]
      },
      {
        "day": "wednesday",
        "isAvailable": true,
        "timeSlots": [{"startTime": "09:00", "endTime": "17:00"}]
      },
      {
        "day": "thursday",
        "isAvailable": true,
        "timeSlots": [{"startTime": "09:00", "endTime": "17:00"}]
      },
      {
        "day": "friday",
        "isAvailable": true,
        "timeSlots": [{"startTime": "09:00", "endTime": "17:00"}]
      },
      {
        "day": "saturday",
        "isAvailable": false,
        "timeSlots": []
      },
      {
        "day": "sunday",
        "isAvailable": false,
        "timeSlots": []
      }
    ]
  },

  // Test case 2: Part-time with split shifts
  partTimeWithSplits: {
    "availability": [
      {
        "day": "monday",
        "isAvailable": true,
        "timeSlots": [
          {"startTime": "06:00", "endTime": "10:00"},
          {"startTime": "18:00", "endTime": "22:00"}
        ]
      },
      {
        "day": "tuesday",
        "isAvailable": false,
        "timeSlots": []
      },
      {
        "day": "wednesday",
        "isAvailable": true,
        "timeSlots": [
          {"startTime": "08:00", "endTime": "12:00"}
        ]
      },
      {
        "day": "thursday",
        "isAvailable": false,
        "timeSlots": []
      },
      {
        "day": "friday",
        "isAvailable": true,
        "timeSlots": [
          {"startTime": "14:00", "endTime": "20:00"}
        ]
      },
      {
        "day": "saturday",
        "isAvailable": true,
        "timeSlots": [
          {"startTime": "10:00", "endTime": "18:00"}
        ]
      },
      {
        "day": "sunday",
        "isAvailable": true,
        "timeSlots": [
          {"startTime": "12:00", "endTime": "16:00"}
        ]
      }
    ]
  },

  // Test case 3: Weekend only
  weekendOnly: {
    "availability": [
      {
        "day": "saturday",
        "isAvailable": true,
        "timeSlots": [{"startTime": "09:00", "endTime": "21:00"}]
      },
      {
        "day": "sunday",
        "isAvailable": true,
        "timeSlots": [{"startTime": "10:00", "endTime": "18:00"}]
      }
    ]
  }
};

console.log('=== Dynamic Availability Test Data ===\n');

console.log('1. Full-time Worker (Monday-Friday 9-5):');
console.log(JSON.stringify(availabilityTestData.fullTime, null, 2));

console.log('\n2. Part-time Worker with Split Shifts:');
console.log(JSON.stringify(availabilityTestData.partTimeWithSplits, null, 2));

console.log('\n3. Weekend Only Worker:');
console.log(JSON.stringify(availabilityTestData.weekendOnly, null, 2));

console.log('\n=== How to Test ===');
console.log('1. Start your server: npm start');
console.log('2. Login as a worker and get your Bearer token');
console.log('3. Test GET /workers/me to see current availability structure');
console.log('4. Test PATCH /workers/me with one of the above availability objects');
console.log('5. Check the response to see both structured and formatted availability');

console.log('\n=== Expected Response Structure ===');
const expectedResponse = {
  "status": "success",
  "data": {
    "profile": {
      "availability": [
        {
          "day": "monday",
          "isAvailable": true,
          "timeSlots": [
            {
              "startTime": "09:00",
              "endTime": "17:00"
            }
          ]
        }
        // ... other days
      ],
      "formattedAvailability": [
        "Monday: 9:00 AM - 5:00 PM"
      ]
      // ... other fields
    }
  }
};
console.log(JSON.stringify(expectedResponse, null, 2));