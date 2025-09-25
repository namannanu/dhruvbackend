# Dynamic Worker Availability API Documentation

The worker profile now supports day-specific availability with multiple time slots per day. This allows workers to set different availability for each day of the week.

## New Availability Structure

```json
{
  "availability": [
    {
      "day": "monday",
      "isAvailable": true,
      "timeSlots": [
        {
          "startTime": "09:00",
          "endTime": "12:00"
        },
        {
          "startTime": "14:00",
          "endTime": "18:00"
        }
      ]
    },
    {
      "day": "tuesday",
      "isAvailable": true,
      "timeSlots": [
        {
          "startTime": "08:00",
          "endTime": "16:00"
        }
      ]
    },
    {
      "day": "wednesday",
      "isAvailable": false,
      "timeSlots": []
    },
    // ... rest of the week
  ]
}
```

## API Endpoints

### GET /workers/me
Returns worker profile with structured availability:

```json
{
  "status": "success",
  "data": {
    "user": { /* user data */ },
    "profile": {
      "_id": "...",
      "user": "...",
      "bio": "...",
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
        },
        {
          "day": "tuesday",
          "isAvailable": false,
          "timeSlots": []
        },
        // ... all 7 days
      ],
      "formattedAvailability": [
        "Monday: 9:00 AM - 5:00 PM"
      ],
      "name": "John Doe",
      "email": "worker@example.com"
    }
  }
}
```

### PATCH /workers/me
Update worker availability:

```json
{
  "availability": [
    {
      "day": "monday",
      "isAvailable": true,
      "timeSlots": [
        {
          "startTime": "08:00",
          "endTime": "12:00"
        },
        {
          "startTime": "13:00",
          "endTime": "17:00"
        }
      ]
    },
    {
      "day": "tuesday",
      "isAvailable": true,
      "timeSlots": [
        {
          "startTime": "10:00",
          "endTime": "18:00"
        }
      ]
    },
    {
      "day": "wednesday",
      "isAvailable": false,
      "timeSlots": []
    }
    // Only include days you want to update
  ]
}
```

## Validation Rules

1. **Day names**: Must be lowercase: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`
2. **Time format**: Must be in 24-hour format `HH:MM` (e.g., `09:00`, `14:30`)
3. **isAvailable**: Boolean value
4. **timeSlots**: Array of time slot objects with `startTime` and `endTime`

## Migration from Legacy Format

The system automatically migrates old availability formats:
- `"Weekdays: 9:00 AM - 5:00 PM"` → Sets Monday-Friday with 09:00-17:00
- `"Weekends: 10:00 AM - 2:00 PM"` → Sets Saturday-Sunday with 10:00-14:00
- `"Monday: 8:00 AM - 6:00 PM"` → Sets Monday with 08:00-18:00

## Example Usage Scenarios

### Full-time Worker (Monday-Friday)
```json
{
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
}
```

### Part-time Worker with Split Shifts
```json
{
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
      "day": "wednesday",
      "isAvailable": true,
      "timeSlots": [
        {"startTime": "08:00", "endTime": "12:00"}
      ]
    },
    {
      "day": "saturday",
      "isAvailable": true,
      "timeSlots": [
        {"startTime": "10:00", "endTime": "18:00"}
      ]
    }
  ]
}
```

### Weekend Only Worker
```json
{
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
```

## Response Fields

- `availability`: Array of day availability objects (structured format)
- `formattedAvailability`: Array of readable strings for display (backwards compatibility)
- `legacyAvailability`: Old format (deprecated, for migration only)

The API now provides both structured data for programmatic use and formatted strings for easy display.