# WorkConnect Backend Testing Guide

## Overview
This comprehensive testing guide covers all testing scenarios for the enhanced WorkConnect backend, including the userId system, Google Places API integration, and team management features.

## Table of Contents
1. [Testing Environment Setup](#testing-environment-setup)
2. [API Testing with Postman](#api-testing-with-postman)
3. [Team Management Testing](#team-management-testing)
4. [Location-Based Testing](#location-based-testing)
5. [UserId System Testing](#userid-system-testing)
6. [Security Testing](#security-testing)
7. [Performance Testing](#performance-testing)
8. [Integration Testing](#integration-testing)

---

## Testing Environment Setup

### Prerequisites
- Node.js and npm installed
- MongoDB running (local or cloud)
- Postman installed
- Test environment variables configured

### Environment Variables
Create a `.env.test` file:

```env
NODE_ENV=test
PORT=3001
MONGODB_URI=mongodb://localhost:27017/workconnect_test
JWT_SECRET=test_jwt_secret_key
JWT_EXPIRES_IN=7d

# Google Places API (for location testing)
GOOGLE_PLACES_API_KEY=your_google_places_api_key

# Email service (for testing notifications)
EMAIL_SERVICE=test
EMAIL_USER=test@example.com
EMAIL_PASS=test_password
```

### Test Database Setup
```bash
# Start MongoDB service
mongod

# Or use Docker
docker run -d -p 27017:27017 --name mongo-test mongo:latest

# Create test database
mongo workconnect_test
```

### Postman Environment Setup
Create a new environment in Postman with these variables:

| Variable | Value | Type |
|----------|--------|------|
| baseUrl | http://localhost:3001/api | default |
| authToken | (auto-populated) | default |
| userId | (auto-populated) | default |
| testUserId | A1B2C3D4 | default |
| managerId | MANAGER1 | default |
| jobId | (auto-populated) | default |
| applicationId | (auto-populated) | default |
| attendanceId | (auto-populated) | default |
| teamAccessId | (auto-populated) | default |

---

## API Testing with Postman

### 1. Authentication Flow Testing

#### Test Case 1: User Registration
```json
POST /api/auth/register
{
  "name": "Test User",
  "email": "test@example.com",
  "phone": "+1234567890",
  "password": "testPassword123",
  "role": "employer"
}
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "userId": "A1B2C3D4",
    "name": "Test User",
    "email": "test@example.com",
    "role": "employer"
  }
}
```

**Validation Points:**
- ✅ Response status: 201
- ✅ JWT token is provided
- ✅ UserId is 8 characters long
- ✅ UserId is alphanumeric and uppercase
- ✅ User object contains all required fields

#### Test Case 2: User Login
```json
POST /api/auth/login
{
  "email": "test@example.com",
  "password": "testPassword123"
}
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "userId": "A1B2C3D4",
    "name": "Test User",
    "email": "test@example.com"
  }
}
```

**Validation Points:**
- ✅ Response status: 200
- ✅ Same userId as registration
- ✅ Valid JWT token

### 2. Job Management Testing

#### Test Case 3: Create Job with Location
```json
POST /api/jobs
{
  "title": "Test Construction Job",
  "description": "Testing job creation with location",
  "location": {
    "address": "123 Test Street, New York, NY 10001",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "googlePlaceId": "ChIJOwg_06VPwokRYv534QaPC8g",
    "geofenceRadius": 150
  },
  "salary": 25,
  "salaryType": "hourly",
  "requirements": ["Test requirement"],
  "workingHours": {
    "start": "09:00",
    "end": "17:00"
  }
}
```

**Validation Points:**
- ✅ Response status: 201
- ✅ Location object has all coordinates
- ✅ Geofence radius is correctly set
- ✅ Job belongs to authenticated user's userId

#### Test Case 4: Location Validation
```json
POST /api/attendance/validate-location
{
  "jobId": "{{jobId}}",
  "latitude": 40.7130,
  "longitude": -74.0062
}
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "isWithinGeofence": true,
    "distance": 25.4,
    "allowedRadius": 150,
    "jobLocation": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  }
}
```

---

## Team Management Testing

### 3. Team Access Flow Testing

#### Test Case 5: Grant Team Access
```json
POST /api/team/grant-access
{
  "targetUserId": "MANAGER1",
  "managedUserId": "A1B2C3D4",
  "role": "manager",
  "permissions": {
    "canCreateJobs": true,
    "canEditJobs": true,
    "canViewJobs": true,
    "canHireWorkers": true,
    "canViewApplications": true,
    "canManageApplications": true,
    "canCreateAttendance": true,
    "canViewAttendance": true
  },
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "reason": "Testing team access functionality"
}
```

**Validation Points:**
- ✅ Response status: 201
- ✅ Team access record created
- ✅ Permissions correctly assigned
- ✅ Expiration date set properly

#### Test Case 6: Check Team Access
```json
GET /api/team/check-access/A1B2C3D4?permission=canCreateJobs
```

**Expected Response (with access):**
```json
{
  "status": "success",
  "data": {
    "hasAccess": true,
    "permission": "canCreateJobs",
    "role": "manager",
    "accessDetails": {
      "grantedAt": "2025-10-04T10:00:00.000Z",
      "expiresAt": "2025-12-31T23:59:59.000Z",
      "isActive": true
    }
  }
}
```

#### Test Case 7: Access User Data via Team Access
```json
GET /api/users/data/A1B2C3D4
Authorization: Bearer {{managerToken}}
```

**Validation Points:**
- ✅ Manager can access employer's data
- ✅ Data filtered based on permissions
- ✅ All accessible modules included
- ✅ Audit trail recorded

### 4. Team Permission Testing

#### Test Case 8: Test Permission Boundaries
```json
// Manager tries to delete a job (should fail if no permission)
DELETE /api/jobs/{{jobId}}
Authorization: Bearer {{managerToken}}
```

**Expected Response (permission denied):**
```json
{
  "status": "error",
  "message": "You don't have permission to delete jobs",
  "code": "INSUFFICIENT_PERMISSIONS",
  "details": {
    "requiredPermission": "canDeleteJobs",
    "userRole": "manager",
    "hasPermission": false
  }
}
```

#### Test Case 9: Update Team Permissions
```json
PATCH /api/team/access/{{teamAccessId}}
{
  "role": "staff",
  "permissions": {
    "canCreateJobs": false,
    "canEditJobs": false,
    "canViewJobs": true,
    "canViewApplications": true,
    "canViewAttendance": true
  }
}
```

**Validation Points:**
- ✅ Permissions successfully updated
- ✅ Role changed to staff
- ✅ Access rights reduced appropriately

---

## Location-Based Testing

### 5. Geofencing Tests

#### Test Case 10: Valid Location Check-in
```json
POST /api/attendance
{
  "jobId": "{{jobId}}",
  "type": "check-in",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 5
  },
  "notes": "Testing valid location check-in"
}
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "attendance_id",
    "type": "check-in",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "isWithinGeofence": true,
      "distanceFromJob": 0,
      "accuracy": 5
    },
    "timestamp": "2025-10-04T09:00:00.000Z"
  }
}
```

#### Test Case 11: Invalid Location Check-in (Outside Geofence)
```json
POST /api/attendance
{
  "jobId": "{{jobId}}",
  "type": "check-in",
  "location": {
    "latitude": 40.7500,
    "longitude": -74.1000,
    "accuracy": 5
  },
  "notes": "Testing invalid location check-in"
}
```

**Expected Response:**
```json
{
  "status": "error",
  "message": "Attendance location is outside the job geofence",
  "code": "GEOFENCE_VIOLATION",
  "details": {
    "distance": 8420.5,
    "allowedRadius": 150,
    "isWithinGeofence": false,
    "jobLocation": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  }
}
```

### 6. Distance Calculation Tests

#### Test Case 12: Distance Calculation Accuracy
Test various distance scenarios:

| From Lat/Lng | To Lat/Lng | Expected Distance (m) | Test Purpose |
|---------------|------------|----------------------|--------------|
| 40.7128, -74.0060 | 40.7130, -74.0062 | ~25 | Close proximity |
| 40.7128, -74.0060 | 40.7200, -74.0200 | ~1200 | Medium distance |
| 40.7128, -74.0060 | 41.0000, -75.0000 | ~100000 | Far distance |

---

## UserId System Testing

### 7. UserId Generation and Uniqueness

#### Test Case 13: UserId Generation
Create multiple users and verify:
- ✅ Each user gets a unique 8-character userId
- ✅ UserIds are alphanumeric and uppercase
- ✅ No duplicate userIds generated
- ✅ UserIds follow pattern: [A-Z0-9]{8}

#### Test Case 14: UserId Data Aggregation
```json
GET /api/users/data/A1B2C3D4
```

**Validation Points:**
- ✅ All user modules included (jobs, applications, attendance, employments, payments)
- ✅ Data belongs to correct userId
- ✅ Summary statistics calculated correctly
- ✅ Response time acceptable (<2 seconds)

### 8. Cross-Module Data Consistency

#### Test Case 15: Data Relationship Validation
1. Create a job with userId "A1B2C3D4"
2. Apply for the job (creates application)
3. Hire the worker (creates employment)
4. Create attendance record
5. Process payment

**Verify:**
- ✅ All records linked to same userId
- ✅ Relationships maintained correctly
- ✅ Data appears in user data aggregation
- ✅ Summary calculations include all records

---

## Security Testing

### 9. Authentication and Authorization

#### Test Case 16: Unauthorized Access
```json
GET /api/users/data/A1B2C3D4
// No Authorization header
```

**Expected Response:**
```json
{
  "status": "error",
  "message": "Access denied. No token provided.",
  "code": "UNAUTHORIZED"
}
```

#### Test Case 17: Invalid Token
```json
GET /api/users/data/A1B2C3D4
Authorization: Bearer invalid_token_here
```

**Expected Response:**
```json
{
  "status": "error",
  "message": "Invalid token",
  "code": "INVALID_TOKEN"
}
```

#### Test Case 18: Expired Token
Use an expired JWT token and verify proper error handling.

#### Test Case 19: Team Access Security
Test scenarios:
- ✅ User cannot access data without proper team access
- ✅ Expired team access properly denied
- ✅ Insufficient permissions handled correctly
- ✅ Revoked access immediately effective

### 10. Input Validation Testing

#### Test Case 20: Invalid Location Data
```json
POST /api/jobs
{
  "title": "Test Job",
  "location": {
    "address": "Test Address",
    "latitude": 91, // Invalid latitude (>90)
    "longitude": -200, // Invalid longitude (<-180)
    "geofenceRadius": 5000 // Too large radius
  }
}
```

**Expected Response:**
```json
{
  "status": "error",
  "message": "Validation error",
  "errors": [
    "Latitude must be between -90 and 90",
    "Longitude must be between -180 and 180",
    "Geofence radius must be between 10 and 1000 meters"
  ]
}
```

---

## Performance Testing

### 11. Load Testing Scenarios

#### Test Case 21: Concurrent User Data Requests
- Simulate 50 concurrent requests to `/api/users/data/:userId`
- Measure response times and error rates
- Verify database connection handling

#### Test Case 22: Team Access Performance
- Create 100 team access records
- Measure permission checking performance
- Test with various permission combinations

#### Test Case 23: Location Calculation Performance
- Test distance calculations with various coordinate sets
- Measure geofence validation performance
- Test with edge cases (poles, date line)

### 12. Database Performance

#### Test Case 24: Data Aggregation Performance
Create test data:
- 1000 jobs per user
- 5000 attendance records
- 2000 applications
- Measure aggregation query performance

---

## Integration Testing

### 13. End-to-End Workflows

#### Test Case 25: Complete Team Management Workflow
1. **Setup Phase**
   - Register employer user (gets userId: A1B2C3D4)
   - Register manager user (gets userId: MANAGER1)
   - Employer creates job with location

2. **Team Access Phase**
   - Employer grants manager access to their data
   - Manager authenticates and checks access
   - Manager accesses employer's job data

3. **Operations Phase**
   - Manager creates attendance record for worker
   - Manager updates job details
   - Manager views attendance reports

4. **Audit Phase**
   - Employer views team access report
   - Verify audit trail completeness
   - Check access statistics

**Validation Points:**
- ✅ Each step completes successfully
- ✅ Data consistency maintained
- ✅ Permissions enforced correctly
- ✅ Audit trail captured

#### Test Case 26: Location-Based Attendance Workflow
1. **Job Setup**
   - Create job with specific location and geofence
   - Verify location data stored correctly

2. **Worker Check-in**
   - Attempt check-in from valid location
   - Verify successful attendance creation
   - Check location validation

3. **Invalid Location Handling**
   - Attempt check-in from outside geofence
   - Verify proper error response
   - Check no attendance record created

4. **Data Verification**
   - Verify attendance appears in user data
   - Check location tracking accuracy
   - Validate geofence calculations

---

## Automated Testing Scripts

### 14. Postman Test Scripts

#### Global Test Script (Collection Level)
```javascript
// Add to Collection Pre-request Script
pm.test("Response format validation", function () {
    const response = pm.response.json();
    pm.expect(response).to.have.property('status');
    
    if (response.status === 'success') {
        pm.expect(response).to.have.property('data');
    } else {
        pm.expect(response).to.have.property('message');
    }
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(3000);
});
```

#### Authentication Test Script
```javascript
// Add to Login request Tests tab
pm.test("Login successful", function () {
    const response = pm.response.json();
    pm.expect(pm.response.code).to.equal(200);
    pm.expect(response.token).to.be.a('string');
    pm.expect(response.user.userId).to.have.lengthOf(8);
    
    // Store token and userId for subsequent requests
    pm.environment.set("authToken", response.token);
    pm.environment.set("userId", response.user.userId);
});
```

#### Team Access Test Script
```javascript
// Add to Grant Team Access request Tests tab
pm.test("Team access granted successfully", function () {
    const response = pm.response.json();
    pm.expect(pm.response.code).to.equal(201);
    pm.expect(response.data.teamAccess.role).to.equal('manager');
    pm.expect(response.data.teamAccess.status).to.equal('active');
    
    // Store team access ID
    pm.environment.set("teamAccessId", response.data.teamAccess._id);
});
```

### 15. Test Data Management

#### Test Data Reset Script
```bash
#!/bin/bash
# reset-test-data.sh

echo "Resetting test database..."

# Drop test database
mongo workconnect_test --eval "db.dropDatabase()"

# Restart application in test mode
NODE_ENV=test npm run dev &

echo "Test environment ready!"
```

#### Test Data Generator
```javascript
// generate-test-data.js
const mongoose = require('mongoose');
const User = require('./src/modules/users/user.model');
const Job = require('./src/modules/jobs/job.model');

async function generateTestData() {
    // Connect to test database
    await mongoose.connect('mongodb://localhost:27017/workconnect_test');
    
    // Create test users
    const testUsers = await Promise.all([
        User.create({
            name: 'Test Employer',
            email: 'employer@test.com',
            password: 'testpassword',
            role: 'employer'
        }),
        User.create({
            name: 'Test Manager',
            email: 'manager@test.com',
            password: 'testpassword',
            role: 'employer'
        }),
        User.create({
            name: 'Test Worker',
            email: 'worker@test.com',
            password: 'testpassword',
            role: 'worker'
        })
    ]);
    
    console.log('Test users created:', testUsers.map(u => ({
        userId: u.userId,
        email: u.email,
        role: u.role
    })));
    
    // Create test jobs
    const testJobs = await Promise.all([
        Job.create({
            userId: testUsers[0].userId,
            title: 'Test Construction Job',
            description: 'Test job for automation',
            location: {
                address: '123 Test Street, New York, NY',
                latitude: 40.7128,
                longitude: -74.0060,
                geofenceRadius: 150
            },
            salary: 25,
            salaryType: 'hourly',
            requirements: ['Test requirement'],
            workingHours: { start: '09:00', end: '17:00' }
        })
    ]);
    
    console.log('Test jobs created:', testJobs.map(j => ({
        id: j._id,
        title: j.title,
        userId: j.userId
    })));
    
    await mongoose.disconnect();
}

generateTestData().catch(console.error);
```

---

## Testing Checklist

### Pre-Testing Setup
- [ ] Test environment configured
- [ ] Test database clean and accessible
- [ ] Postman collection imported
- [ ] Environment variables set
- [ ] Test data generated

### Core Functionality Tests
- [ ] User registration and login
- [ ] UserId generation and uniqueness
- [ ] Job creation with location
- [ ] Attendance with geofencing
- [ ] Application management
- [ ] Payment processing

### Team Management Tests
- [ ] Grant team access
- [ ] Check team permissions
- [ ] Access user data via team access
- [ ] Update team permissions
- [ ] Revoke team access
- [ ] Team access audit trail

### Security Tests
- [ ] Authentication validation
- [ ] Authorization enforcement
- [ ] Team access security
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS protection

### Performance Tests
- [ ] Response time validation
- [ ] Concurrent user handling
- [ ] Database query performance
- [ ] Memory usage monitoring
- [ ] Error rate tracking

### Integration Tests
- [ ] End-to-end workflows
- [ ] Cross-module data consistency
- [ ] External API integration
- [ ] Error handling flows
- [ ] Recovery scenarios

---

This comprehensive testing guide ensures thorough validation of all WorkConnect backend features, providing confidence in the system's reliability, security, and performance.