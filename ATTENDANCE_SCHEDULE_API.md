# Worker Attendance Schedule API

This endpoint powers the worker-facing "attendance table" by returning past and upcoming attendance entries grouped by date with helpful summary totals.

## Endpoints

- `GET /workers/me/attendance/schedule`
- `GET /workers/:workerId/attendance/schedule`

Both endpoints require authentication. A worker can only view their own schedule. Employers or admins can provide a specific `:workerId` to inspect another worker's schedule.

## Query Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `status` | string | Optional status filter. Accepts `scheduled`, `clocked-in`, `completed`, `missed`. Use `all` (default) to include every status. |
| `from` | string (YYYY-MM-DD) | Optional start date (inclusive). When provided, the schedule only includes records on or after this date. |
| `to` | string (YYYY-MM-DD) | Optional end date (inclusive). When provided, the schedule only includes records on or before this date. |
| `jobId` | string | Restrict results to a single job. |
| `businessId` | string | Restrict results to a single business. |

## Example Request

```http
GET /workers/me/attendance/schedule?status=all&from=2024-07-01&to=2024-07-31
Authorization: Bearer <worker_token>
```

## Example Response

```json
{
  "status": "success",
  "data": {
    "workerId": "64f1c7916df0b122943d7f03",
    "summary": {
      "totalRecords": 6,
      "pastCount": 3,
      "upcomingCount": 3,
      "byStatus": {
        "scheduled": 2,
        "clocked-in": 1,
        "completed": 2,
        "missed": 1
      },
      "firstUpcomingDate": "2024-07-19",
      "lastPastDate": "2024-07-15",
      "range": {
        "start": "2024-07-12",
        "end": "2024-07-28"
      }
    },
    "schedule": [
      {
        "date": "2024-07-15",
        "dayOfWeek": "Monday",
        "isPast": true,
        "isUpcoming": false,
        "isFuture": false,
        "isToday": false,
        "hasInProgress": false,
        "totals": {
          "count": 2,
          "plannedHours": 14,
          "actualHours": 12.5,
          "earnings": 262.5,
          "byStatus": {
            "completed": 2
          }
        },
        "entries": [
          {
            "id": "66a0f8971f8a431356b1c2aa",
            "status": "completed",
            "jobId": "66a0d6f58d82c211e4e7f94b",
            "jobTitle": "Barista",
            "businessId": "669fa3b07e21a610c4a221a9",
            "businessName": "Cafe Collective",
            "location": "Austin, TX",
            "scheduledStart": "2024-07-15T14:00:00.000Z",
            "scheduledEnd": "2024-07-15T22:00:00.000Z",
            "scheduledStartTime": "14:00",
            "scheduledEndTime": "22:00",
            "scheduledStartLabel": "2:00 PM",
            "scheduledEndLabel": "10:00 PM",
            "clockInAt": "2024-07-15T13:55:12.000Z",
            "clockOutAt": "2024-07-15T21:47:31.000Z",
            "plannedHours": 8,
            "actualHours": 7.87,
            "hourlyRate": 21,
            "earnings": 165.27,
            "isLate": false,
            "notes": null,
            "isPast": true,
            "isUpcoming": false,
            "isToday": false,
            "isFuture": false,
            "isInProgress": false,
            "isCompleted": true,
            "isMissed": false,
            "isClockedIn": false
          }
        ]
      },
      {
        "date": "2024-07-19",
        "dayOfWeek": "Friday",
        "isPast": false,
        "isUpcoming": true,
        "isFuture": false,
        "isToday": false,
        "hasInProgress": true,
        "totals": {
          "count": 1,
          "plannedHours": 6,
          "actualHours": 0,
          "earnings": 0,
          "byStatus": {
            "clocked-in": 1
          }
        },
        "entries": [
          {
            "id": "66a0fa211f8a431356b1c2ad",
            "status": "clocked-in",
            "jobId": "66a0d6f58d82c211e4e7f94b",
            "jobTitle": "Barista",
            "businessId": "669fa3b07e21a610c4a221a9",
            "businessName": "Cafe Collective",
            "location": "Austin, TX",
            "scheduledStart": "2024-07-19T15:00:00.000Z",
            "scheduledEnd": "2024-07-19T21:00:00.000Z",
            "scheduledStartTime": "15:00",
            "scheduledEndTime": "21:00",
            "scheduledStartLabel": "3:00 PM",
            "scheduledEndLabel": "9:00 PM",
            "clockInAt": "2024-07-19T15:02:13.000Z",
            "clockOutAt": null,
            "plannedHours": 6,
            "actualHours": null,
            "hourlyRate": 21,
            "earnings": null,
            "isLate": true,
            "notes": "Running 2 minutes late",
            "isPast": false,
            "isUpcoming": true,
            "isToday": true,
            "isFuture": false,
            "isInProgress": true,
            "isCompleted": false,
            "isMissed": false,
            "isClockedIn": true
          }
        ]
      }
    ]
  }
}
```

## Notes

- `plannedHours` is the scheduled duration based on `scheduledStart` and `scheduledEnd`.
- `actualHours` and `earnings` reflect real-world attendance data when the worker clocks in/out.
- Day-level `totals` make it easy to render summary rows in the UI without additional calculations.
- Records without a `scheduledStart` are skipped to keep the table well-formed.
