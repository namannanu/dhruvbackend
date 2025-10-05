# Team Access Testing Guide

## Quick Start Testing Workflow

### Step 1: Setup Team Access (Run as Business Owner)
1. **Login as business owner** (the employee whose data will be managed)
2. **Grant access to team members** with different permission levels

### Step 2: Login as Team Members and Test Operations

## Test Scenarios Overview

### 🔧 Setup Phase (Business Owner)
```bash
POST /team/grant-access
```
Create team access for:
- **Manager** (`manager@company.com`) - `full_access`
- **Supervisor** (`supervisor@company.com`) - `manage_operations` 
- **Assistant** (`assistant@company.com`) - `view_only`

---

### 👨‍💼 Manager Testing (Full Access)
**Token**: Use manager's JWT token
**Expected**: Can perform ALL operations

#### Jobs
- ✅ `GET /jobs` - List all jobs
- ✅ `POST /jobs` - Create new jobs
- ✅ `PATCH /jobs/{id}` - Update jobs
- ✅ `DELETE /jobs/{id}` - Delete jobs

#### Attendance  
- ✅ `GET /attendance` - View attendance
- ✅ `POST /attendance` - Create attendance
- ✅ `PATCH /attendance/{id}` - Edit attendance

#### Applications
- ✅ `GET /applications` - View applications
- ✅ `PATCH /applications/{id}` - Manage applications

---

### 👨‍🔧 Supervisor Testing (Limited Operations)
**Token**: Use supervisor's JWT token
**Expected**: Can view and edit, but limited create permissions

#### Jobs
- ✅ `GET /jobs` - List jobs (has permission)
- ✅ `PATCH /jobs/{id}` - Update jobs (has permission)
- ❌ `POST /jobs` - Create jobs (no permission - should fail)

#### Attendance
- ✅ `GET /attendance` - View attendance (has permission)
- ✅ `PATCH /attendance/{id}` - Edit attendance (has permission)

#### Applications
- ✅ `GET /applications` - View applications (has permission)
- ✅ `PATCH /applications/{id}` - Manage applications (has permission)

---

### 👨‍💻 Assistant Testing (View Only)
**Token**: Use assistant's JWT token  
**Expected**: Can only READ data, all write operations should fail

#### Read Operations (Should Work)
- ✅ `GET /jobs` - View jobs
- ✅ `GET /attendance` - View attendance
- ✅ `GET /applications` - View applications

#### Write Operations (Should Fail with 403)
- ❌ `POST /jobs` - Create jobs (no permission)
- ❌ `PATCH /jobs/{id}` - Update jobs (no permission)
- ❌ `PATCH /attendance/{id}` - Edit attendance (no permission)
- ❌ `PATCH /applications/{id}` - Manage applications (no permission)

---

## API Endpoints for Testing

### Team Management
```bash
# Check access permissions
GET /team/check-access-by-email/{userEmail}?permission=canViewJobs

# List access I have been granted
GET /team/my-access

# Update team member permissions (email-based)
PATCH /team/access/{userEmail}

# Revoke team access (email-based)  
DELETE /team/access/{userEmail}
```

### Core Operations to Test
```bash
# Jobs
GET /jobs
POST /jobs
PATCH /jobs/{jobId}
DELETE /jobs/{jobId}

# Attendance
GET /attendance
POST /attendance  
PATCH /attendance/{attendanceId}

# Applications
GET /applications
PATCH /applications/{applicationId}

# Businesses
GET /businesses
POST /businesses
```

---

## Expected Results Matrix

| Operation | Manager | Supervisor | Assistant |
|-----------|---------|------------|-----------|
| View Jobs | ✅ | ✅ | ✅ |
| Create Jobs | ✅ | ❌ | ❌ |
| Edit Jobs | ✅ | ✅ | ❌ |
| View Attendance | ✅ | ✅ | ✅ |
| Edit Attendance | ✅ | ✅ | ❌ |
| View Applications | ✅ | ✅ | ✅ |
| Manage Applications | ✅ | ✅ | ❌ |

---

## Environment Variables for Postman

```javascript
{
  "baseUrl": "http://localhost:3000/api/v1",
  "ownerToken": "JWT_OF_BUSINESS_OWNER",
  "managerToken": "JWT_OF_MANAGER", 
  "supervisorToken": "JWT_OF_SUPERVISOR",
  "assistantToken": "JWT_OF_ASSISTANT",
  "employeeId": "OWNER_OBJECT_ID",
  "employeeEmail": "owner@company.com"
}
```

---

## Quick Test Commands

### 1. Grant Access (Owner)
```bash
curl -X POST {{baseUrl}}/team/grant-access \
  -H "Authorization: Bearer {{ownerToken}}" \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "manager@company.com",
    "accessLevel": "full_access"
  }'
```

### 2. Test as Manager
```bash
curl -X GET {{baseUrl}}/jobs \
  -H "Authorization: Bearer {{managerToken}}"
```

### 3. Test as Assistant (Should Fail)
```bash
curl -X POST {{baseUrl}}/jobs \
  -H "Authorization: Bearer {{assistantToken}}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Job"}'
```

This should return `403 Forbidden` for the assistant since they only have view permissions.