# WorkConnect Backend API Reference

## 📚 Complete API Reference Guide

### Base Information
- **Base URL**: `https://dhruvbackend.vercel.app/api`
- **API Version**: 3.0.0
- **Authentication**: JWT Bearer Token
- **Content-Type**: `application/json`

---

## 🔐 Authentication Endpoints

### 1. User Registration
```http
POST /auth/signup
Content-Type: application/json

{
  "firstname": "John",
  "lastname": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "password": "securePassword123",
  "userType": "employer"
}
```

**Response (201)**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "userId": "7YUEPZY9",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@example.com",
      "userType": "employer",
      "phone": "+1234567890",
      "premium": false
    }
  }
}
```

### 2. User Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

**Response (200)**:
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "userId": "7YUEPZY9",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@example.com",
      "userType": "employer"
    }
  }
}
```

---

## 👥 User Management Endpoints

### 3. Get My Profile
```http
GET /users/me
Authorization: Bearer {token}
```

### 4. Update My Profile
```http
PATCH /users/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1987654321"
}
```

### 5. List All Users
```http
GET /users
Authorization: Bearer {token}

# Optional query parameters:
GET /users?userType=employer
```

### 6. Get Specific User
```http
GET /users/{userId}
Authorization: Bearer {token}
```

---

## 🎯 Public UserId Endpoints (No Auth Required)

### 7. Get User Profile by UserId
```http
GET /users/userId/{userId}
```

**Response (200)**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "userId": "7YUEPZY9",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "userType": "worker",
      "phone": "+1234567890",
      "premium": false
    },
    "profile": {
      "bio": "Experienced construction worker",
      "skills": ["JavaScript", "Node.js"],
      "rating": 4.5,
      "completedJobs": 25,
      "totalEarnings": 15000
    }
  }
}
```

### 8. Get Complete User Data by UserId
```http
GET /users/userId/{userId}/all-data

# Optional query parameters:
GET /users/userId/{userId}/all-data?includeJobs=true&includeApplications=true&startDate=2025-10-01&endDate=2025-10-31
```

**Response (200)**:
```json
{
  "status": "success",
  "data": {
    "user": { /* user info */ },
    "jobs": [ /* array of jobs */ ],
    "applications": [ /* array of applications */ ],
    "attendance": [ /* array of attendance records */ ],
    "employment": [ /* array of employment records */ ]
  }
}
```

---

## 🏢 Team Management Endpoints

### 9. Grant Team Access
```http
POST /team/grant-access
Authorization: Bearer {token}
Content-Type: application/json

{
  "targetUserEmail": "teammember@example.com",
  "role": "manager",
  "permissions": {
    "canCreateJobs": true,
    "canEditJobs": true,
    "canViewJobs": true,
    "canHireWorkers": true,
    "canViewApplications": true,
    "canManageApplications": true,
    "canCreateAttendance": true,
    "canViewAttendance": true,
    "canEditAttendance": false,
    "canManageEmployment": false,
    "canViewEmployment": true,
    "canViewPayments": false,
    "canProcessPayments": false,
    "canManageTeam": false,
    "canViewTeamReports": true
  },
  "restrictions": {
    "startDate": "2025-10-01",
    "endDate": "2025-12-31"
  },
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "reason": "Temporary manager access for Q4 operations"
}
```

**Response (201)**:
```json
{
  "status": "success",
  "data": {
    "teamAccess": {
      "_id": "670fb4c2b8a5d3e4f5a6b7c8",
      "role": "manager",
      "status": "active",
      "permissions": { /* granted permissions */ }
    },
    "summary": {
      "employeeUserId": "7YUEPZY9",
      "teamMemberEmail": "teammember@example.com",
      "accessLevel": "manager"
    }
  }
}
```

### 10. Check Team Access by Email
```http
GET /team/check-access-by-email/{email}
Authorization: Bearer {token}

# Optional query parameters:
GET /team/check-access-by-email/employee@example.com?permission=canCreateJobs
```

### 11. List My Team Members
```http
GET /team/my-team
Authorization: Bearer {token}
```

### 12. List My Managed Access
```http
GET /team/my-access
Authorization: Bearer {token}
```

### 13. Update Team Permissions
```http
PATCH /team/access/{teamAccessId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "role": "staff",
  "permissions": {
    "canCreateJobs": false,
    "canEditJobs": false,
    "canViewJobs": true
  },
  "expiresAt": "2025-11-30T23:59:59.000Z"
}
```

### 14. Revoke Team Access
```http
DELETE /team/access/{teamAccessId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Project completed, access no longer needed"
}
```

### 15. Get Access Report
```http
GET /team/report/{userId}
Authorization: Bearer {token}
```

---

## 💼 Jobs Management Endpoints

### 16. Create Job
```http
POST /jobs
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Construction Worker",
  "description": "Building construction work with safety protocols",
  "location": {
    "address": "123 Main Street, New York, NY 10001",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "googlePlaceId": "ChIJOwg_06VPwokRYv534QaPC8g",
    "geofenceRadius": 150
  },
  "salary": 25,
  "salaryType": "hourly",
  "requirements": ["Physical fitness", "Construction experience"],
  "workingHours": {
    "start": "08:00",
    "end": "17:00"
  },
  "category": "construction",
  "skillsRequired": ["Heavy lifting", "Tool operation"],
  "benefits": ["Health insurance", "Overtime pay"]
}
```

### 17. Get Jobs by UserId (Public)
```http
GET /jobs/user/{userId}
```

### 18. Search Jobs by Location
```http
GET /jobs/search
Authorization: Bearer {token}

# Query parameters:
GET /jobs/search?latitude=40.7128&longitude=-74.0060&radius=5000
```

### 19. Update Job
```http
PATCH /jobs/{jobId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "location": {
    "address": "456 Updated Street, New York, NY 10002",
    "latitude": 40.7580,
    "longitude": -73.9855,
    "geofenceRadius": 200
  }
}
```

### 20. Delete Job
```http
DELETE /jobs/{jobId}
Authorization: Bearer {token}
```

---

## 📝 Applications Management Endpoints

### 21. Apply for Job
```http
POST /applications
Authorization: Bearer {token}
Content-Type: application/json

{
  "jobId": "670fb4c2b8a5d3e4f5a6b7c8",
  "coverLetter": "I am very interested in this position...",
  "expectedSalary": 28,
  "availability": {
    "startDate": "2025-10-15",
    "preferredShifts": ["morning", "afternoon"]
  }
}
```

### 22. Get Applications by UserId (Public)
```http
GET /applications/user/{userId}
```

### 23. Update Application Status
```http
PATCH /applications/{applicationId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "accepted",
  "notes": "Candidate selected for the position"
}
```

---

## ⏰ Attendance Management Endpoints

### 24. Check-In/Check-Out
```http
POST /attendance
Authorization: Bearer {token}
Content-Type: application/json

{
  "jobId": "670fb4c2b8a5d3e4f5a6b7c8",
  "type": "check-in",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 5
  },
  "notes": "Started morning shift on time"
}
```

**Response (201)**:
```json
{
  "status": "success",
  "data": {
    "_id": "670fb4c2b8a5d3e4f5a6b7c8",
    "type": "check-in",
    "timestamp": "2025-10-04T08:00:00.000Z",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "isWithinGeofence": true,
      "distanceFromJob": 45.7
    },
    "notes": "Started morning shift on time"
  }
}
```

### 25. Get Attendance by UserId (Public)
```http
GET /attendance/user/{userId}

# Optional query parameters:
GET /attendance/user/{userId}?startDate=2025-10-01&endDate=2025-10-31
```

### 26. Validate Attendance Location
```http
POST /attendance/validate-location
Authorization: Bearer {token}
Content-Type: application/json

{
  "jobId": "670fb4c2b8a5d3e4f5a6b7c8",
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

---

## 🏢 Business Management Endpoints

### 27. Create Business Profile
```http
POST /businesses
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "ABC Construction Company",
  "description": "Leading construction company in NYC",
  "industry": "Construction",
  "location": {
    "address": "789 Business Ave, New York, NY 10003",
    "latitude": 40.7589,
    "longitude": -73.9851,
    "googlePlaceId": "ChIJOwg_06VPwokRYv534QaPC8g"
  },
  "contact": {
    "phone": "+1234567890",
    "email": "info@abcconstruction.com",
    "website": "https://abcconstruction.com"
  },
  "employees": 50,
  "founded": "2010-01-01"
}
```

**Response (201)**:
```json
{
  "status": "success",
  "data": {
    "_id": "670fb4c2b8a5d3e4f5a6b7c8",
    "name": "ABC Construction Company",
    "description": "Leading construction company in NYC",
    "industry": "Construction",
    "location": {
      "address": "789 Business Ave, New York, NY 10003",
      "latitude": 40.7589,
      "longitude": -73.9851
    },
    "owner": "670fb4c2b8a5d3e4f5a6b7c9",
    "isActive": true,
    "createdAt": "2025-10-05T12:00:00.000Z"
  },
  "message": "Business created with GPS location for attendance tracking"
}
```

### 28. Get Business by UserId (Public)
```http
GET /businesses/user/{userId}
```

---

## 💰 Payment Endpoints

### 29. Get Payments by UserId (Public)
```http
GET /payments/user/{userId}
```

**Response (200)**:
```json
{
  "status": "success",
  "data": [
    {
      "_id": "670fb4c2b8a5d3e4f5a6b7c8",
      "amount": 1250.00,
      "type": "salary",
      "status": "completed",
      "paymentDate": "2025-10-01T00:00:00.000Z",
      "description": "September 2025 Salary"
    }
  ]
}
```

---

## 🔔 Notification Endpoints

### 30. Get Notifications by UserId (Public)
```http
GET /notifications/user/{userId}
```

**Response (200)**:
```json
{
  "status": "success",
  "data": [
    {
      "_id": "670fb4c2b8a5d3e4f5a6b7c8",
      "title": "New Job Application",
      "message": "You have received a new application for Construction Worker position",
      "type": "application",
      "read": false,
      "createdAt": "2025-10-04T12:00:00.000Z"
    }
  ]
}
```

---

## 📊 Subscription Endpoints

### 31. Get Subscription by UserId (Public)
```http
GET /subscriptions/user/{userId}
```

**Response (200)**:
```json
{
  "status": "success",
  "data": {
    "_id": "670fb4c2b8a5d3e4f5a6b7c8",
    "plan": "premium",
    "status": "active",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T23:59:59.000Z",
    "features": ["unlimited_jobs", "team_management", "advanced_analytics"]
  }
}
```

---

## 🎯 UserId Endpoints Summary

### Public Endpoints (No Authentication Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/jobs/user/{userId}` | GET | Get all jobs for user |
| `/applications/user/{userId}` | GET | Get all applications for user |
| `/attendance/user/{userId}` | GET | Get attendance records for user |
| `/businesses/user/{userId}` | GET | Get business profile for user |
| `/payments/user/{userId}` | GET | Get payment records for user |
| `/notifications/user/{userId}` | GET | Get notifications for user |
| `/subscriptions/user/{userId}` | GET | Get subscription info for user |
| `/users/userId/{userId}` | GET | Get basic user profile |
| `/users/userId/{userId}/all-data` | GET | Get complete user data |

---

## 🔧 Error Responses

### Standard Error Format
```json
{
  "status": "error",
  "message": "Descriptive error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "specific field error"
  }
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `422`: Validation Error
- `500`: Server Error

---

## 🚀 Team Access Workflow

### Step 1: Grant Access
Employee grants access to team member using their email:
```http
POST /team/grant-access
{
  "targetUserEmail": "manager@company.com",
  "role": "manager",
  "permissions": { /* permissions object */ }
}
```

### Step 2: Get Employee UserId
Response includes `employeeUserId` for team member to use:
```json
{
  "data": {
    "summary": {
      "employeeUserId": "7YUEPZY9"
    }
  }
}
```

### Step 3: Access Data
Team member uses employeeUserId to access all data:
```http
GET /jobs/user/7YUEPZY9
GET /attendance/user/7YUEPZY9
GET /users/userId/7YUEPZY9/all-data
```

---

## 📱 Flutter Integration Examples

### Authentication Flow
```dart
// Register user
final response = await http.post(
  Uri.parse('$baseUrl/auth/signup'),
  headers: {'Content-Type': 'application/json'},
  body: json.encode({
    'firstname': 'John',
    'lastname': 'Doe',
    'email': 'john@example.com',
    'password': 'password123',
    'userType': 'worker'
  }),
);

// Login user
final loginResponse = await http.post(
  Uri.parse('$baseUrl/auth/login'),
  headers: {'Content-Type': 'application/json'},
  body: json.encode({
    'email': 'john@example.com',
    'password': 'password123'
  }),
);

final userData = json.decode(loginResponse.body);
final token = userData['token'];
final userId = userData['data']['user']['userId'];
```

### Team Access Data Fetching
```dart
// Team member accessing employee data (no auth needed)
Future<Map<String, dynamic>> getEmployeeData(String employeeUserId) async {
  final endpoints = [
    '/jobs/user/$employeeUserId',
    '/applications/user/$employeeUserId',
    '/attendance/user/$employeeUserId',
    '/payments/user/$employeeUserId',
    '/notifications/user/$employeeUserId',
  ];
  
  final futures = endpoints.map((endpoint) => 
    http.get(Uri.parse('$baseUrl$endpoint'))
  );
  
  final responses = await Future.wait(futures);
  
  return {
    'jobs': json.decode(responses[0].body),
    'applications': json.decode(responses[1].body),
    'attendance': json.decode(responses[2].body),
    'payments': json.decode(responses[3].body),
    'notifications': json.decode(responses[4].body),
  };
}
```

### Location-Based Attendance
```dart
// Check-in with location validation
Future<void> checkIn(String jobId, double lat, double lng) async {
  final response = await http.post(
    Uri.parse('$baseUrl/attendance'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    },
    body: json.encode({
      'jobId': jobId,
      'type': 'check-in',
      'location': {
        'latitude': lat,
        'longitude': lng,
        'accuracy': 5
      },
      'notes': 'Checked in via mobile app'
    }),
  );
  
  final data = json.decode(response.body);
  if (data['data']['location']['isWithinGeofence']) {
    // Success: within geofence
  } else {
    // Error: outside allowed area
  }
}
```

---

## 🔑 API Key & Environment

### Environment Variables
```bash
# MongoDB
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Google Places
GOOGLE_PLACES_API_KEY=your-google-api-key

# App Config
NODE_ENV=production
PORT=3000
```

### Rate Limiting
- **General**: 100 requests/minute per IP
- **Auth**: 10 requests/minute per IP
- **UserId endpoints**: No rate limit (public access)

---

*This API reference covers all 31 endpoints in the WorkConnect Backend v3.0.0*