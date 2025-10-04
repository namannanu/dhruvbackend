# UserId-Based Data Access API

## Overview

These endpoints allow team members to access employee data using just the employee's **userId** instead of authentication tokens. This makes team management much easier - team members can access all employee data through a unified interface.

## 🔐 Authentication

**These endpoints are PUBLIC** - No authentication token required! Team members can access data directly using the employee's userId.

## 📋 Available Endpoints

### 1. Jobs Data
**Endpoint:** `GET /api/jobs/user/{userId}`  
**Example:** `GET /api/jobs/user/7YUEPZY9`  
**Response:** All jobs created by the employee

```json
{
  "status": "success",
  "results": 5,
  "data": [
    {
      "_id": "...",
      "title": "Software Developer",
      "description": "Full-time position",
      "employer": "...",
      "business": "...",
      "status": "active"
    }
  ]
}
```

### 2. Applications Data  
**Endpoint:** `GET /api/applications/user/{userId}`  
**Example:** `GET /api/applications/user/7YUEPZY9`  
**Response:** All applications for the employee's jobs

```json
{
  "status": "success", 
  "results": 12,
  "data": [
    {
      "_id": "...",
      "job": "...",
      "worker": "...",
      "status": "pending",
      "appliedAt": "2025-10-04T..."
    }
  ]
}
```

### 3. Attendance Data
**Endpoint:** `GET /api/attendance/user/{userId}`  
**Example:** `GET /api/attendance/user/7YUEPZY9`  
**Response:** All attendance records for the employee

```json
{
  "status": "success",
  "results": 8,
  "data": [
    {
      "_id": "...",
      "worker": "...",
      "job": "...",
      "date": "2025-10-04",
      "clockIn": "09:00",
      "clockOut": "17:00",
      "status": "completed"
    }
  ]
}
```

### 4. Business Data
**Endpoint:** `GET /api/businesses/user/{userId}`  
**Example:** `GET /api/businesses/user/7YUEPZY9`  
**Response:** All businesses owned by the employee

```json
{
  "status": "success",
  "results": 2,
  "data": [
    {
      "_id": "...",
      "name": "Tech Solutions Inc",
      "description": "Software development company",
      "owner": "...",
      "location": {...}
    }
  ]
}
```

### 5. Payments Data
**Endpoint:** `GET /api/payments/user/{userId}`  
**Example:** `GET /api/payments/user/7YUEPZY9`  
**Response:** All payments made by the employee

```json
{
  "status": "success",
  "results": 3,
  "data": [
    {
      "_id": "...",
      "employer": "...",
      "amount": 29.99,
      "currency": "USD",
      "description": "Job posting purchase",
      "status": "succeeded"
    }
  ]
}
```

### 6. Notifications Data
**Endpoint:** `GET /api/notifications/user/{userId}`  
**Example:** `GET /api/notifications/user/7YUEPZY9`  
**Response:** All notifications for the employee

```json
{
  "status": "success",
  "results": 6,
  "data": [
    {
      "_id": "...",
      "user": "...",
      "title": "New Application Received",
      "message": "You have a new job application",
      "type": "application",
      "readAt": null
    }
  ]
}
```

### 7. Subscription Data
**Endpoint:** `GET /api/subscriptions/user/{userId}`  
**Example:** `GET /api/subscriptions/user/7YUEPZY9`  
**Response:** Subscription information for the employee

```json
{
  "status": "success",
  "data": {
    "user": "...",
    "plan": "premium",
    "status": "active",
    "renewsAt": "2025-11-04T..."
  }
}
```

## 🔄 Team Management Workflow

### Step 1: Employee Grants Access
```bash
POST /api/team/grant-access
{
  "targetUserEmail": "teammember@example.com",
  "role": "manager",
  "permissions": {...}
}
```

**Response includes:**
```json
{
  "summary": {
    "employeeUserId": "7YUEPZY9"  // Team member uses this
  }
}
```

### Step 2: Team Member Gets Employee UserId
```bash
GET /api/team/my-access
```

**Response:**
```json
{
  "data": {
    "managedAccess": [
      {
        "managedUserId": "7YUEPZY9",  // Use this in all endpoints
        "originalUser": {...},
        "role": "manager"
      }
    ]
  }
}
```

### Step 3: Team Member Accesses All Data
Using the `managedUserId` (7YUEPZY9), team member can access:

- **Jobs:** `GET /api/jobs/user/7YUEPZY9`
- **Applications:** `GET /api/applications/user/7YUEPZY9`  
- **Attendance:** `GET /api/attendance/user/7YUEPZY9`
- **Businesses:** `GET /api/businesses/user/7YUEPZY9`
- **Payments:** `GET /api/payments/user/7YUEPZY9`
- **Notifications:** `GET /api/notifications/user/7YUEPZY9`
- **Subscription:** `GET /api/subscriptions/user/7YUEPZY9`

## 🎯 Benefits

1. **No Token Required**: Team members don't need employee's authentication token
2. **Unified Access**: One userId gives access to ALL employee data
3. **Simple Integration**: Easy to integrate into team management dashboards
4. **Consistent API**: All endpoints follow the same `/user/{userId}` pattern
5. **Replica Experience**: Team member gets exact same data as employee would see

## 📱 Frontend Implementation

### React/Flutter Example:
```javascript
const employeeUserId = "7YUEPZY9"; // From team access grant
const apiBase = "https://dhruvbackend.vercel.app/api";

// Get all employee data
const jobs = await fetch(`${apiBase}/jobs/user/${employeeUserId}`);
const applications = await fetch(`${apiBase}/applications/user/${employeeUserId}`);
const attendance = await fetch(`${apiBase}/attendance/user/${employeeUserId}`);
const businesses = await fetch(`${apiBase}/businesses/user/${employeeUserId}`);
const payments = await fetch(`${apiBase}/payments/user/${employeeUserId}`);
const notifications = await fetch(`${apiBase}/notifications/user/${employeeUserId}`);
const subscription = await fetch(`${apiBase}/subscriptions/user/${employeeUserId}`);

// Build complete employee dashboard
const employeeData = {
  jobs: await jobs.json(),
  applications: await applications.json(), 
  attendance: await attendance.json(),
  businesses: await businesses.json(),
  payments: await payments.json(),
  notifications: await notifications.json(),
  subscription: await subscription.json()
};
```

## 🔒 Security Note

While these endpoints are public (no auth required), they only return data for valid userIds. Team access permissions are managed through the separate team management system.

---

*This creates a complete replica of the employee's data accessible to authorized team members through simple userId-based endpoints!*