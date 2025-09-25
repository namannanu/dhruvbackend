# Worker Dashboard Metrics API Documentation

This API endpoint provides comprehensive dashboard metrics for workers, aggregating data from their profile, applications, shifts, attendance, and more.

## Endpoint

### GET `/workers/me/dashboard`
Get dashboard metrics for the authenticated worker.

### GET `/workers/:workerId/dashboard`
Get dashboard metrics for a specific worker (requires proper authorization).

## Query Parameters

- `include` (optional): Comma-separated list of sections to include
  - Default: `freeTier,premium,counts`
  - Available: `freeTier`, `premium`, `counts`, `profile`, `performance`, `availability`

## Example Request

```http
GET /workers/me/dashboard?include=freeTier,premium,counts
Authorization: Bearer <your_token>
```

## Response Structure

```json
{
  "status": "success",
  "data": {
    "metrics": {
      "profile": {
        "completeness": 85,
        "rating": 4.5,
        "totalEarnings": 2500.00,
        "weeklyEarnings": 450.00,
        "completedJobs": 12,
        "isVerified": true,
        "joinedDate": "2025-08-15T10:30:00.000Z",
        "lastActive": "2025-09-25T08:46:04.001Z"
      },
      "counts": {
        "totalApplications": 25,
        "weeklyApplications": 5,
        "monthlyApplications": 18,
        "totalShifts": 30,
        "weeklyShifts": 6,
        "monthlyShifts": 22,
        "totalAttendance": 28,
        "weeklyAttendance": 6,
        "monthlyAttendance": 21
      },
      "applications": {
        "total": 25,
        "byStatus": {
          "pending": 3,
          "accepted": 15,
          "rejected": 5,
          "withdrawn": 2
        },
        "successRate": 60
      },
      "performance": {
        "attendanceRate": 93,
        "weeklyAttendanceRate": 100,
        "reliability": "High"
      },
      "availability": {
        "totalDaysAvailable": 5,
        "hasFlexibleHours": true,
        "preferredRadius": 25
      },
      "freeTier": {
        "jobApplicationsUsed": 3,
        "jobApplicationsLimit": 5,
        "remainingApplications": 2
      },
      "premium": {
        "isActive": false,
        "features": [],
        "benefits": {}
      },
      "notifications": {
        "enabled": true
      }
    },
    "include": "freeTier,premium,counts"
  }
}
```

## Metrics Breakdown

### Profile Metrics
- **completeness**: Profile completion percentage (0-100%)
- **rating**: Worker's average rating
- **totalEarnings**: Lifetime earnings
- **weeklyEarnings**: Current week earnings
- **completedJobs**: Total number of completed jobs
- **isVerified**: Account verification status
- **joinedDate**: When the worker joined
- **lastActive**: Last activity timestamp

### Count Metrics
- **totalApplications**: All-time job applications
- **weeklyApplications**: Applications this week
- **monthlyApplications**: Applications this month
- **totalShifts**: All-time scheduled shifts
- **weeklyShifts**: Shifts this week
- **monthlyShifts**: Shifts this month
- **totalAttendance**: All-time attendance records
- **weeklyAttendance**: Attendance this week
- **monthlyAttendance**: Attendance this month

### Application Metrics
- **total**: Total applications
- **byStatus**: Breakdown by application status
  - `pending`: Applications awaiting response
  - `accepted`: Successful applications
  - `rejected`: Declined applications
  - `withdrawn`: Worker-cancelled applications
- **successRate**: Percentage of accepted applications

### Performance Metrics
- **attendanceRate**: Overall attendance percentage
- **weeklyAttendanceRate**: This week's attendance percentage
- **reliability**: Based on rating (`High`, `Medium`, `Low`)

### Availability Metrics
- **totalDaysAvailable**: Number of days per week available
- **hasFlexibleHours**: Whether worker has multiple time slots
- **preferredRadius**: Maximum travel distance (miles)

### Free Tier Metrics
- **jobApplicationsUsed**: Applications used in free tier
- **jobApplicationsLimit**: Maximum free applications allowed
- **remainingApplications**: Remaining free applications

### Premium Metrics
- **isActive**: Whether user has premium subscription
- **features**: Available premium features (if subscribed)
- **benefits**: Premium benefits object

## Profile Completeness Calculation

Profile completeness is calculated based on these weighted fields:
- **Bio**: 20 points
- **Skills**: 20 points (if has skills)
- **Experience**: 15 points
- **Languages**: 10 points (if has languages)
- **Availability**: 25 points (if has availability)
- **Phone**: 10 points

**Total**: 100 points maximum

## Usage Examples

### Basic Dashboard Data
```http
GET /workers/me/dashboard
```

### Specific Sections Only
```http
GET /workers/me/dashboard?include=profile,performance
```

### Complete Metrics
```http
GET /workers/me/dashboard?include=freeTier,premium,counts,profile,performance,availability
```

## Error Responses

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Authentication required. Please log in."
}
```

### 403 Forbidden
```json
{
  "status": "error",
  "message": "You can only view your own dashboard metrics"
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "Worker not found"
}
```

## Integration Notes

This API is designed to work with the Flutter app's `fetchWorkerDashboardMetrics` method and provides:

1. **Comprehensive Data**: All metrics needed for dashboard display
2. **Flexible Querying**: Use `include` parameter to fetch specific sections
3. **Performance Optimized**: Single endpoint for all dashboard data
4. **Fallback Compatible**: Handles missing data gracefully
5. **Real-time Calculations**: Metrics calculated from current database state

The response structure matches the expected format from your Flutter client, providing both the main `metrics` object and the compatibility `include` parameter in the response.