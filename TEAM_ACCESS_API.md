# Team Access API Documentation

## Simplified Team Access Flow

### 1. Grant Team Access (Employee grants access to team member)

**Endpoint:** `POST /api/team/grant-access`

**Request Body:**
```json
{
  "targetUserEmail": "teammember@example.com",
  "role": "manager",
  "permissions": {
    "canCreateJobs": true,
    "canEditJobs": true,
    "canViewJobs": true,
    "canHireWorkers": true
  }
}
```

**What happens:**
- Employee (current user) grants access to their data
- Only needs team member's **email** (no userId required)
- Automatically uses current user's userId as the managed data

**Response:**
```json
{
  "status": "success",
  "message": "manager access granted successfully",
  "data": {
    "teamAccess": { ... },
    "summary": {
      "grantedTo": "John Smith (teammember@example.com)",
      "managedUserData": "Employee Name (ABC12345)",
      "role": "manager",
      "permissions": { ... },
      "employeeUserId": "ABC12345"  // Team member uses this to access data
    }
  }
}
```

### 2. Check Team Access by Email (NEW)

**Endpoint:** `GET /api/team/check-access-by-email/{userEmail}?permission=canCreateJobs`

**Purpose:** Check if a specific user (by email) has permission to access the current user's data

**Example:** `GET /api/team/check-access-by-email/j@gmail.com?permission=canCreateJobs`

**What it checks:** Does "j@gmail.com" have permission to create jobs for the current user's data?

**Response (if access granted):**
```json
{
  "status": "success",
  "data": {
    "hasAccess": true,
    "reason": "Team access granted",
    "role": "manager",
    "permission": "canCreateJobs",
    "targetUser": {
      "userId": "BLW1MNSM",
      "email": "j@gmail.com",
      "name": "John Doe"
    }
  }
}
```

**Response (if no access):**
```json
{
  "status": "success",
  "data": {
    "hasAccess": false,
    "reason": "No team access granted for this user",
    "targetUser": {
      "userId": "BLW1MNSM",
      "email": "j@gmail.com",
      "name": "John Doe"
    }
  }
}
```

### 3. List My Managed Access (Team member sees which employee data they can access)

**Endpoint:** `GET /api/team/my-access`

**Response:**
```json
{
  "status": "success",
  "results": 1,
  "data": {
    "managedAccess": [
      {
        "managedUserId": "ABC12345",  // Use this userId in other API calls
        "originalUser": {
          "firstName": "Employee",
          "lastName": "Name",
          "email": "employee@example.com",
          "userId": "ABC12345"
        },
        "role": "manager",
        "permissions": { ... }
      }
    ]
  }
}
```

### 4. Using the Employee UserId

Once team member gets the `managedUserId` (employee's userId), they can use existing endpoints:

- `GET /api/jobs/user/ABC12345` - Get employee's jobs
- `GET /api/applications/user/ABC12345` - Get employee's applications
- `GET /api/attendance/user/ABC12345` - Get employee's attendance
- etc.

## Updated Postman Request Formats

### Grant Access (Simplified):
```json
{
  "targetUserEmail": "teammember@email.com",  // Just email!
  "role": "manager",
  "permissions": {
    "canCreateJobs": true,
    "canEditJobs": true,
    "canViewJobs": true
  }
}
```

### Check Access (Email-based):
```
GET {{baseUrl}}/team/check-access-by-email/employee@example.com?permission=canCreateJobs
```

Instead of:
```
GET {{baseUrl}}/team/check-access/{{userId}}?permission=canCreateJobs
```

## Available Endpoints

### Employee Actions:
- `POST /api/team/grant-access` - Grant access using email
- `GET /api/team/my-team` - See who has access to my data

### Team Member Actions:
- `GET /api/team/my-access` - See which employee data I can access
- `GET /api/team/check-access-by-email/{email}?permission={perm}` - Check specific permissions

### Both:
- `PATCH /api/team/access/{teamAccessId}` - Update permissions
- `DELETE /api/team/access/{teamAccessId}` - Revoke access

## Workflow Summary

1. **Employee** grants access using team member's **email only**
2. **Team member** can check access using employee's **email** (no userId needed)
3. **Team member** calls `/api/team/my-access` to get employee's **userId**
4. **Team member** uses that **userId** in existing API endpoints to access employee's data

This creates a replica-like experience where team members can access employee data using the established userId-based endpoints, but the setup process is simplified to use emails only.