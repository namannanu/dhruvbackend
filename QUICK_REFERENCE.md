# Quick Reference: TeamAccess System Changes

## Files Modified & Key Changes

### 1. Core TeamAccess Model
**File:** `src/modules/team/teamAccess.model.js`
- ✅ 47+ granular permissions (canCreateJobs, canHireWorkers, etc.)
- ✅ Access levels: full_access, manage_operations, view_only
- ✅ Access scopes: business_specific, all_owner_businesses, independent_operator
- ✅ Business context with allBusinesses support
- ✅ Validation methods: isAccessValid, getEffectivePermissions, hasPermission

### 2. Permission Middleware Enhancement
**File:** `src/shared/middlewares/permissionMiddleware.js`
- ✅ TeamAccess integration in getUserPermissions()
- ✅ Complete permission mapping (camelCase → snake_case)
- ✅ Business context validation for different access scopes
- ✅ Enhanced getBusinessIdFromRequest() with 8 extraction methods
- ✅ Dual mappings: attendance & shift permissions → schedule permissions

### 3. Business Access Utilities
**File:** `src/shared/utils/businessAccess.js`
- ✅ ensureBusinessAccess() with TeamAccess support
- ✅ MongoDB query for TeamAccess validation
- ✅ Permission validation switch with 47+ mappings
- ✅ getAccessibleBusinessIds() supporting all access patterns
- ✅ Business ownership + TeamAccess + legacy team member support

### 4. Job Routes Protection
**File:** `src/modules/jobs/job.routes.js`
- ✅ Worker-friendly job viewing (no permissions needed)
- ✅ Employer permission requirements maintained
- ✅ ensureViewJobDetailsPermission middleware
- ✅ All job operations use permission validation

### 5. Job Controller Integration
**File:** `src/modules/jobs/job.controller.js`
- ✅ Job creation uses ensureBusinessAccess()
- ✅ Hiring process validates business access
- ✅ Business ID extraction from request body
- ✅ Enhanced error handling for business context

## Permission Mappings Added

### TeamAccess → System Permissions
```javascript
// Job Management
canCreateJobs → create_jobs
canEditJobs → edit_jobs
canDeleteJobs → delete_jobs
canViewJobs → view_jobs

// Worker Management
canHireWorkers → hire_workers
canFireWorkers → fire_workers
canManageWorkers → manage_workers
canViewWorkers → view_workers

// Schedule & Attendance (Dual Mapping)
canCreateShifts → create_shifts, create_schedules
canEditShifts → edit_shifts, edit_schedules
canCreateAttendance → create_attendance, create_schedules
canEditAttendance → edit_attendance, edit_schedules

// Application Management
canViewApplications → view_applications
canManageApplications → manage_applications

// Business Management
canCreateBusiness → create_business
canEditBusiness → edit_business
canDeleteBusiness → delete_business
canViewBusiness → view_business

// Financial Management
canViewPayments → view_payments
canManagePayments → manage_payments
canProcessPayments → process_payments
canViewBudgets → view_budgets
canManageBudgets → manage_budgets

// Team Management
canViewTeam → view_team
canManageTeam → manage_team
canGrantAccess → grant_access

// Analytics & Reporting
canViewAnalytics → view_analytics
canViewReports → view_reports
canExportData → export_data
```

## Business ID Extraction Methods

### getBusinessIdFromRequest() Priority Order:
1. **JWT Token:** `req.tokenPayload.businessId`
2. **URL Params:** `req.params.businessId`
3. **Employer ID:** `Business.findOne({ owner: employerId })`
4. **Job ID:** `Job.findById(jobId).business`
5. **Application ID:** `Application → Job → Business`
6. **Request Body:** `req.body.businessId || req.body.business`
7. **Query Params:** `req.query.businessId`
8. **Headers:** `req.headers['x-business-id']`
9. **User's Business:** `Business.findOne({ owner: userId })`

## TeamAccess Business Context

### Access Scopes:
- **independent_operator:** Can manage own businesses + allBusinesses access
- **business_specific:** Limited to specific businessId
- **all_owner_businesses:** Access to all businesses of original user
- **user_specific:** Access to specific user's resources

### Business Context Schema:
```javascript
businessContext: {
  businessId: ObjectId,           // Specific business (optional)
  allBusinesses: Boolean,         // All managed user's businesses
  canCreateNewBusiness: Boolean,  // Can create new businesses
  canGrantAccessToOthers: Boolean // Can delegate access
}
```

## Key Functions Added/Enhanced

### 1. ensureBusinessAccess()
```javascript
await ensureBusinessAccess({
  user: req.user,
  businessId: extractedBusinessId,
  requiredPermissions: ['create_jobs']
});
```

### 2. getUserPermissions()
```javascript
const permissions = await getUserPermissions(userId, businessId);
// Returns: ['create_jobs', 'view_jobs', 'hire_workers', ...]
```

### 3. getBusinessIdFromRequest()
```javascript
const businessId = await getBusinessIdFromRequest(req);
// Extracts business ID from any request context
```

### 4. requirePermissions()
```javascript
router.post('/', protect, requirePermissions('create_jobs'), controller.createJob);
// Validates permissions with business context
```

## Common Issues Resolved

### 1. Permission Mapping Mismatches
- **Problem:** Routes expected `create_schedules`, TeamAccess had `canCreateAttendance`
- **Solution:** Added dual mapping so attendance permissions grant schedule permissions

### 2. Business ID Extraction Failures
- **Problem:** Job ID → Business ID lookup failing for non-existent jobs
- **Solution:** Enhanced extraction with error handling and multiple fallback methods

### 3. Worker Job Access
- **Problem:** Workers couldn't view job details due to permission requirements
- **Solution:** Created worker-friendly middleware that bypasses permissions for workers

### 4. TeamAccess Query Complexity
- **Problem:** Complex MongoDB queries for TeamAccess validation
- **Solution:** Structured $and/$or queries with proper business context matching

## Testing Validation

### Confirmed Working:
- ✅ TeamAccess permission resolution
- ✅ Business ID extraction from jobs/applications
- ✅ Permission mapping (camelCase ↔ snake_case)
- ✅ Business context validation
- ✅ Worker job viewing without permissions
- ✅ Employer permission requirements
- ✅ Schedule permission dual mapping
- ✅ allBusinesses access pattern
- ✅ Business ownership validation

### Test Cases:
1. User with `canViewJobs: true` → Can view job details ✅
2. User with `canCreateJobs: true` → Can create jobs ✅  
3. User with `canHireWorkers: true` → Can hire workers ✅
4. User with `canCreateAttendance: true` → Can create schedules ✅
5. Worker user → Can view any job details ✅
6. Business owner → Gets all permissions ✅
7. TeamAccess with `allBusinesses: true` → Access to all managed businesses ✅

## Implementation Benefits

1. **Flexible Access Control:** Support for complex organizational structures
2. **Granular Permissions:** 47+ specific permissions for fine-grained control
3. **Business Context Aware:** All operations validate against correct business scope
4. **Backward Compatible:** Legacy team membership still works
5. **Scalable Architecture:** Easy to add new permissions and access patterns
6. **Secure by Default:** Multi-layer validation with clear error messages
7. **Debuggable:** Comprehensive logging for permission resolution
8. **Worker Friendly:** Simple access for job viewing without complex permissions