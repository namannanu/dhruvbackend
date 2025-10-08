# Business ID Integration & Connectivity Map

## Overview
This document maps how Business ID flows through every part of the application and connects all components in the team management system.

## Business ID Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Request       │    │   Middleware     │    │   Business      │
│   Context       │───▶│   Extraction     │───▶│   Validation    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   URL Params    │    │getBusinessId     │    │ensureBusiness   │
│   Body/Query    │    │FromRequest()     │    │Access()         │
│   Headers       │    │                  │    │                 │
│   JWT Token     │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Related IDs   │    │   Permission     │    │   TeamAccess    │
│   (Job,App,etc) │    │   Resolution     │    │   Validation    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 1. Business ID Sources & Extraction Points

### A. Direct Business ID Sources
```javascript
// 1. URL Parameters
GET /businesses/:businessId
POST /businesses/:businessId/jobs
PATCH /businesses/:businessId/settings

// 2. Request Body
POST /jobs { businessId: "68e2a895077beb8cafcadbdb" }
POST /applications { business: "68e2a895077beb8cafcadbdb" }

// 3. Query Parameters
GET /jobs?businessId=68e2a895077beb8cafcadbdb
GET /analytics?business=68e2a895077beb8cafcadbdb

// 4. Headers
x-business-id: 68e2a895077beb8cafcadbdb
```

### B. Indirect Business ID Sources (Related Entity Lookup)

#### Job-to-Business Mapping
```javascript
// Request: GET /jobs/:jobId
// Resolution: Job.findById(jobId).business → businessId

Flow:
Request URL: /jobs/68e2ec8aacb76ebec3d8ceb0
↓
Job Document: { _id: "68e2ec8aacb76ebec3d8ceb0", business: "68e2a895077beb8cafcadbdb" }
↓
Business ID: "68e2a895077beb8cafcadbdb"
```

#### Application-to-Business Mapping
```javascript
// Request: GET /applications/:applicationId
// Resolution: Application → Job → Business

Flow:
Request URL: /applications/67020f844e069da6e0a4ba1c
↓
Application.populate('job', 'business')
↓
Job.business → businessId
```

#### User-to-Business Mapping (Primary Business)
```javascript
// For employer users without explicit business context
// Resolution: Business.findOne({ owner: userId })

Flow:
User ID: "68e2aeba7df47ac55d65a0af"
↓
Business.findOne({ owner: "68e2aeba7df47ac55d65a0af" })
↓
Primary Business ID: "68e2a895077beb8cafcadbdb"
```

## 2. Business ID Integration Points

### A. Middleware Layer (`permissionMiddleware.js`)

#### getBusinessIdFromRequest() Function
```javascript
async function getBusinessIdFromRequest(req) {
  // Priority Order:
  
  // 1. JWT Token Context (Highest Priority)
  if (req.tokenPayload?.businessId) {
    return req.tokenPayload.businessId;
  }
  
  // 2. Direct URL Parameters
  if (req.params.businessId) {
    return req.params.businessId;
  }
  
  // 3. Employer ID to Business Mapping
  if (req.params.employerId) {
    const business = await Business.findOne({ owner: req.params.employerId });
    return business?._id.toString();
  }
  
  // 4. Job ID to Business Mapping
  if (req.params.jobId) {
    const job = await Job.findById(req.params.jobId).select('business');
    return job?.business?.toString();
  }
  
  // 5. Application ID to Business Mapping
  if (req.params.applicationId) {
    const app = await Application.findById(req.params.applicationId)
      .populate('job', 'business');
    return app?.job?.business?.toString();
  }
  
  // 6. Request Body/Query
  if (req.body.businessId || req.body.business) {
    return req.body.businessId || req.body.business;
  }
  
  if (req.query.businessId || req.query.business) {
    return req.query.businessId || req.query.business;
  }
  
  // 7. Headers
  if (req.headers['x-business-id']) {
    return req.headers['x-business-id'];
  }
  
  // 8. User's Primary Business (Employers)
  if (req.user?.userType === 'employer') {
    const business = await Business.findOne({ owner: req.user.id });
    return business?._id.toString();
  }
  
  return null;
}
```

### B. Business Access Validation (`businessAccess.js`)

#### ensureBusinessAccess() Integration
```javascript
await ensureBusinessAccess({
  user: req.user,                    // Current user
  businessId: extractedBusinessId,   // From getBusinessIdFromRequest()
  requiredPermissions: ['view_jobs'] // Required permissions
});

// Returns:
{
  business: BusinessDocument,        // Validated business
  isOwner: boolean,                 // True if user owns business
  teamMember: TeamMemberDocument,   // Legacy team member (if exists)
  teamAccess: TeamAccessDocument    // New TeamAccess record (if exists)
}
```

### C. Permission Resolution Chain

```javascript
// 1. Extract Business ID
const businessId = await getBusinessIdFromRequest(req);

// 2. Get User Permissions for Business
const permissions = await getUserPermissions(req.user.id, businessId);

// 3. Permission Resolution Priority:
//    a) Business Owner → All permissions
//    b) TeamAccess → Mapped permissions
//    c) Legacy TeamMember → Role-based permissions
//    d) No access → Empty permissions

// 4. Validate Required Permissions
const hasAccess = permissions.includes(requiredPermission);
```

## 3. Route-Level Business ID Integration

### A. Job Routes (`/jobs/*`)

```javascript
// GET /jobs/:jobId
router.get('/:jobId', protect, ensureViewJobDetailsPermission, controller.getJob);

Flow:
1. protect → Authenticate user
2. ensureViewJobDetailsPermission → Extract businessId from jobId
3. controller.getJob → Use validated business context

// POST /jobs
router.post('/', protect, requirePermissions('create_jobs'), controller.createJob);

Flow:
1. protect → Authenticate user
2. requirePermissions('create_jobs') → Extract businessId from request body
3. controller.createJob → Use ensureBusinessAccess()
```

### B. Application Routes (`/applications/*`)

```javascript
// POST /jobs/:jobId/applications/:applicationId/hire
router.post('/applications/:applicationId/hire', 
  protect, 
  requirePermissions('hire_workers'), 
  controller.hireApplicant
);

Flow:
1. Extract businessId from applicationId → job.business
2. Validate user has 'hire_workers' permission for that business
3. Process hiring with business context
```

### C. Business Routes (`/businesses/*`)

```javascript
// GET /businesses/:businessId
router.get('/:businessId', protect, requirePermissions('view_business'), controller.getBusiness);

Flow:
1. Direct businessId from URL parameter
2. Validate user access to specific business
3. Return business data if authorized
```

## 4. Controller-Level Business ID Usage

### A. Job Controller Integration

#### Job Creation
```javascript
exports.createJob = catchAsync(async (req, res, next) => {
  // 1. Extract business ID from request
  const businessId = req.body.business || req.body.businessId;
  
  // 2. Validate business access
  const { business } = await ensureBusinessAccess({
    user: req.user,
    businessId,
    requiredPermissions: 'create_jobs',
  });
  
  // 3. Create job with validated business
  const job = await Job.create({
    ...req.body,
    business: business._id,
    employer: req.user._id
  });
});
```

#### Hiring Process
```javascript
exports.hireApplicant = catchAsync(async (req, res, next) => {
  // 1. Get application and related job
  const application = await Application.findById(applicationId).populate('job');
  
  // 2. Extract business ID from job
  const businessId = application.job.business;
  
  // 3. Validate hiring permissions
  await ensureBusinessAccess({
    user: req.user,
    businessId,
    requiredPermissions: 'hire_workers',
  });
  
  // 4. Process hiring with business context
});
```

### B. Business Controller Integration

```javascript
exports.createBusiness = catchAsync(async (req, res, next) => {
  // For business creation, no existing businessId needed
  // But validate user can create businesses via TeamAccess
  
  const permissions = await getUserPermissions(req.user.id, null);
  if (!permissions.includes('create_business')) {
    return next(new AppError('Insufficient permissions to create business', 403));
  }
});
```

## 5. TeamAccess Business Context Integration

### A. Business Context Schema
```javascript
businessContext: {
  businessId: ObjectId,           // Specific business access
  allBusinesses: Boolean,         // Access to all managed user's businesses
  canCreateNewBusiness: Boolean,  // Can create new businesses
  canGrantAccessToOthers: Boolean // Can delegate access to others
}
```

### B. Access Scope Business Validation

#### Independent Operator
```javascript
if (teamAccess.accessScope === 'independent_operator') {
  // User can:
  // 1. Manage businesses they own
  // 2. Manage businesses with allBusinesses=true access
  // 3. Create new businesses (if permission granted)
  
  if (businessId) {
    const business = await Business.findById(businessId);
    
    // Check ownership
    if (business.owner.toString() === userId.toString()) {
      return grantAccess(); // User owns this business
    }
    
    // Check allBusinesses access
    if (teamAccess.businessContext?.allBusinesses) {
      const managedUserId = teamAccess.originalUser;
      if (business.owner.toString() === managedUserId.toString()) {
        return grantAccess(); // Business belongs to managed user
      }
    }
  }
}
```

#### Business Specific
```javascript
if (teamAccess.accessScope === 'business_specific') {
  // User can only access specific business
  if (businessId !== teamAccess.businessContext.businessId.toString()) {
    throw new AppError('Access limited to specific business only', 403);
  }
}
```

#### All Owner Businesses
```javascript
if (teamAccess.accessScope === 'all_owner_businesses') {
  // User can access all businesses owned by original user
  if (businessId) {
    const business = await Business.findById(businessId);
    if (business.owner.toString() !== teamAccess.originalUser.toString()) {
      throw new AppError('Business not owned by managed user', 403);
    }
  }
}
```

## 6. Database Relationships & Business ID Connections

### A. Core Business Relationships

```javascript
// Business Model
Business: {
  _id: ObjectId,
  owner: ObjectId (User),
  // ... other fields
}

// Job Model
Job: {
  _id: ObjectId,
  business: ObjectId (Business),
  employer: ObjectId (User),
  // ... other fields
}

// Application Model
Application: {
  _id: ObjectId,
  job: ObjectId (Job),
  worker: ObjectId (User),
  // business derived via Job.business
}

// TeamAccess Model
TeamAccess: {
  _id: ObjectId,
  employeeId: ObjectId (User),        // User receiving access
  managedUser: ObjectId (User),       // User granting access
  businessContext: {
    businessId: ObjectId (Business),  // Specific business (optional)
    allBusinesses: Boolean           // All businesses of managed user
  }
}
```

### B. Business ID Query Patterns

#### Find User's Accessible Businesses
```javascript
async function getAccessibleBusinessIds(user) {
  const userId = user._id;
  
  // 1. Owned businesses
  const ownedBusinesses = await Business.find({ owner: userId });
  
  // 2. TeamAccess businesses
  const teamAccessRecords = await TeamAccess.find({
    $or: [
      { employeeId: userId },
      { userEmail: user.email }
    ],
    status: 'active'
  });
  
  // 3. Combine and return all accessible business IDs
  const accessibleIds = new Set();
  
  // Add owned businesses
  ownedBusinesses.forEach(b => accessibleIds.add(b._id.toString()));
  
  // Add TeamAccess businesses
  for (const access of teamAccessRecords) {
    if (access.businessContext?.allBusinesses) {
      // Get all businesses of managed user
      const managedUserBusinesses = await Business.find({ 
        owner: access.managedUser 
      });
      managedUserBusinesses.forEach(b => accessibleIds.add(b._id.toString()));
    } else if (access.businessContext?.businessId) {
      // Specific business access
      accessibleIds.add(access.businessContext.businessId.toString());
    }
  }
  
  return Array.from(accessibleIds);
}
```

## 7. Business ID Error Handling & Validation

### A. Business ID Missing
```javascript
// When business ID cannot be extracted
if (!businessId && options.requireBusinessId !== false) {
  return next(new AppError('Business ID required', 400));
}
```

### B. Business Not Found
```javascript
// When business ID doesn't exist
const business = await Business.findById(businessId);
if (!business) {
  throw new AppError('Business not found', 404);
}
```

### C. Access Denied
```javascript
// When user lacks access to business
if (!hasAccess) {
  throw new AppError('You are not a team member of this business', 403);
}

// When user lacks specific permissions
if (!hasRequiredPermissions) {
  throw new AppError(`Insufficient permissions. Required: ${permissions}`, 403);
}
```

## 8. Business ID Logging & Debugging

### A. Permission Resolution Logging
```javascript
console.log(`Getting permissions for user ${userId} and business ${businessId}`);
console.log(`Found team access with level ${teamAccess.accessLevel}`);
console.log(`Business context:`, teamAccess.businessContext);
console.log(`Resolved permissions:`, permissions);
```

### B. Business Access Logging
```javascript
console.log(`Validating business access:`, {
  userId,
  businessId,
  requiredPermissions,
  isOwner,
  hasTeamAccess: !!teamAccess
});
```

## Summary

The Business ID integration creates a comprehensive connectivity map where:

1. **Every request** can have its business context extracted through multiple pathways
2. **Every permission check** validates against the correct business scope
3. **Every operation** ensures proper business access before execution
4. **TeamAccess records** provide flexible business delegation mechanisms
5. **Legacy systems** remain compatible while new features leverage enhanced access control

This architecture ensures that business context is never lost and all operations maintain proper security boundaries while supporting complex organizational access patterns.