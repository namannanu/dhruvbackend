# WorkConnect Backend Permission System Documentation

## Overview

The WorkConnect backend implements a comprehensive role-based access control (RBAC) system that manages user permissions across various business operations. This system ensures secure access to endpoints and functionality based on user roles and specific permission assignments.

## Architecture

### Core Components

1. **Permission Middleware** (`src/shared/middlewares/permissionMiddleware.js`)
2. **Team Member Model** (`src/modules/businesses/teamMember.model.js`)
3. **User Authentication** (`src/shared/middlewares/auth.middleware.js`)
4. **Route Protection** (Applied across all module routes)

### Permission Flow

```
User Request → Authentication → Permission Check → Business Context → Endpoint Access
```

## All Available Permissions

### Business Management
| Permission | Description | Use Case |
|------------|-------------|----------|
| `create_business` | Create new business entities | Business registration |
| `edit_business` | Modify business information | Business profile updates |
| `delete_business` | Remove business entities | Business closure |
| `view_business_analytics` | Access business analytics data | Performance monitoring |
| `view_business_profile` | View business profile information | Profile access |
| `edit_business_profile` | Modify business profile | Profile management |
| `view_dashboard` | Access business dashboard | Overview access |

### Job Management
| Permission | Description | Use Case |
|------------|-------------|----------|
| `create_jobs` | Create new job postings | Job creation |
| `edit_jobs` | Modify existing job postings | Job updates |
| `delete_jobs` | Remove job postings | Job removal |
| `view_jobs` | View job listings | Job browsing |
| `post_jobs` | Publish jobs to platforms | Job publishing |

### Worker & Application Management
| Permission | Description | Use Case |
|------------|-------------|----------|
| `hire_workers` | Hire applicants for jobs | Hiring decisions |
| `fire_workers` | Terminate worker employment | Employment termination |
| `view_applications` | View job applications | Application review |
| `manage_applications` | Handle application lifecycle | Application processing |
| `approve_applications` | Approve job applications | Application approval |
| `reject_applications` | Reject job applications | Application rejection |

### Schedule & Attendance Management
| Permission | Description | Use Case |
|------------|-------------|----------|
| `create_schedules` | Create work schedules | Schedule planning |
| `edit_schedules` | Modify existing schedules | Schedule adjustments |
| `delete_schedules` | Remove schedules | Schedule removal |
| `manage_schedules` | Full schedule management | Schedule oversight |
| `view_schedules` | View work schedules | Schedule access |
| `view_attendance` | View attendance records | Attendance monitoring |
| `manage_attendance` | Handle attendance data | Attendance management |
| `approve_attendance` | Approve attendance records | Attendance validation |

### Payment & Financial Management
| Permission | Description | Use Case |
|------------|-------------|----------|
| `view_payments` | View payment information | Payment monitoring |
| `manage_payments` | Handle payment processing | Payment management |
| `process_payments` | Execute payment transactions | Payment processing |
| `view_financial_reports` | Access financial reports | Financial analysis |
| `view_budget` | View budget information | Budget monitoring |
| `manage_budget` | Handle budget management | Budget control |

### Team Management
| Permission | Description | Use Case |
|------------|-------------|----------|
| `invite_team_members` | Invite new team members | Team expansion |
| `view_team_members` | View team member information | Team visibility |
| `edit_team_members` | Modify team member details | Team management |
| `manage_team_members` | Full team member management | Team oversight |
| `remove_team_members` | Remove team members | Team reduction |
| `manage_permissions` | Handle permission assignments | Permission control |

### Communication & Messaging
| Permission | Description | Use Case |
|------------|-------------|----------|
| `view_messages` | View messages | Communication access |
| `send_messages` | Send messages | Communication |
| `view_notifications` | View notifications | Notification access |
| `send_notifications` | Send notifications | Notification distribution |

### Analytics & Reporting
| Permission | Description | Use Case |
|------------|-------------|----------|
| `view_analytics` | Access analytics data | Data analysis |
| `view_reports` | View system reports | Reporting |
| `export_data` | Export data from system | Data export |

### System Administration
| Permission | Description | Use Case |
|------------|-------------|----------|
| `manage_settings` | Manage system settings | System configuration |
| `view_audit_logs` | View audit trail | Security monitoring |
| `manage_integrations` | Handle integrations | Integration management |
| `manage_subscriptions` | Handle subscription management | Subscription control |

## User Roles & Default Permissions

### Owner
- **Description**: Business owner with full access
- **Permissions**: All permissions (complete system access)
- **Use Case**: Business founders and primary stakeholders

### Admin
- **Description**: Administrative users with full access
- **Permissions**: All permissions (complete system access)
- **Use Case**: Technical administrators and key management

### Manager
- **Description**: Management-level users with broad access
- **Permissions**: Comprehensive permissions excluding certain admin functions
- **Key Areas**: 
  - Full business management
  - Complete job and application management
  - Full team management capabilities
  - Payment and financial oversight
  - Analytics and reporting access

### Supervisor
- **Description**: Supervisory users with operational access
- **Permissions**: Operational permissions for day-to-day management
- **Key Areas**:
  - Job viewing and posting
  - Application management
  - Schedule and attendance management
  - Basic team visibility
  - Limited financial access

### Staff
- **Description**: Basic staff members with limited access
- **Permissions**: View-only access with minimal operational permissions
- **Key Areas**:
  - Basic business profile viewing
  - Job viewing
  - Schedule and attendance viewing
  - Team member visibility
  - Basic communication access

## API Endpoint Protection

### Business Endpoints
```javascript
POST   /api/businesses           → create_business
PUT    /api/businesses          → edit_business
PATCH  /api/businesses          → edit_business
DELETE /api/businesses          → delete_business
GET    /api/businesses/analytics → view_business_analytics
```

### Job Endpoints
```javascript
POST   /api/jobs                → create_jobs
PUT    /api/jobs               → edit_jobs
PATCH  /api/jobs               → edit_jobs
DELETE /api/jobs               → delete_jobs
GET    /api/jobs               → view_jobs
POST   /api/jobs/publish       → post_jobs
```

### Application Endpoints
```javascript
GET    /api/applications           → view_applications
PUT    /api/applications          → manage_applications
PATCH  /api/applications          → manage_applications
POST   /api/applications/approve  → approve_applications
POST   /api/applications/reject   → reject_applications
```

### Team Management Endpoints
```javascript
POST   /api/team/invite         → invite_team_members
PUT    /api/team               → edit_team_members
PATCH  /api/team               → edit_team_members
DELETE /api/team               → remove_team_members
PUT    /api/team/permissions   → manage_permissions
```

### Attendance Endpoints
```javascript
GET    /api/attendance         → view_attendance
PUT    /api/attendance         → manage_attendance
PATCH  /api/attendance         → manage_attendance
POST   /api/attendance/approve → approve_attendance
```

### Payment Endpoints
```javascript
GET    /api/payments           → view_payments
PUT    /api/payments           → manage_payments
PATCH  /api/payments           → manage_payments
POST   /api/payments/process   → process_payments
GET    /api/reports/financial  → view_financial_reports
```

## Permission Middleware Functions

### Core Functions

#### `requirePermissions(permissions)`
Middleware that checks if the current user has required permissions.

```javascript
// Single permission
router.post('/jobs', requirePermissions('create_jobs'), controller.createJob);

// Multiple permissions (user needs ANY of these)
router.get('/team', requirePermissions(['view_team_members']), controller.listTeam);

// Multiple permissions (user needs ALL of these)
router.post('/hire', requirePermissions(['hire_workers', 'manage_applications']), controller.hire);
```

#### `hasPermission(userId, businessId, permission)`
Check if a user has a specific permission in a business context.

#### `getUserPermissions(userId, businessId)`
Get all permissions for a user within a specific business.

#### `mapTeamAccessToBusinessPermissions(teamAccess)`
Convert team access boolean flags to business permission strings.

```javascript
const teamAccess = {
  canCreateJobs: true,
  canViewJobs: true,
  canManageApplications: true
};
const permissions = mapTeamAccessToBusinessPermissions(teamAccess);
// Returns: ['create_jobs', 'view_jobs', 'manage_applications']
```

## Team Access Permission Mapping

The system supports converting boolean team access flags to permission strings:

| Team Access Flag | Permission String |
|------------------|-------------------|
| `canCreateJobs` | `create_jobs` |
| `canEditJobs` | `edit_jobs` |
| `canDeleteJobs` | `delete_jobs` |
| `canViewJobs` | `view_jobs` |
| `canViewApplications` | `view_applications` |
| `canManageApplications` | `manage_applications` |
| `canCreateShifts` | `create_shifts` |
| `canEditShifts` | `edit_shifts` |
| `canDeleteShifts` | `delete_shifts` |
| `canViewShifts` | `view_shifts` |
| `canViewWorkers` | `view_workers` |
| `canManageWorkers` | `manage_workers` |
| `canViewTeam` | `view_team_members` |
| `canManageTeam` | `manage_team_members` |
| `canEditBusiness` | `edit_business` |
| `canViewBusiness` | `view_business` |
| `canViewPayments` | `view_payments` |
| `canManagePayments` | `manage_payments` |
| `canViewBudgets` | `view_budgets` |
| `canManageBudgets` | `manage_budgets` |
| `canViewAttendance` | `view_attendance` |
| `canManageAttendance` | `manage_attendance` |

## Usage Examples

### Route Protection
```javascript
// Single permission requirement
router.post('/', requirePermissions('create_jobs'), controller.createJob);

// Multiple permission options (OR logic)
router.get('/', requirePermissions(['view_jobs', 'manage_jobs']), controller.listJobs);

// Role-based restriction with permissions
router.post('/', restrictTo('employer'), requirePermissions('create_business'), controller.createBusiness);
```

### Controller Permission Checks
```javascript
// Check permissions in controller
const hasPermission = await checkUserPermission(req.user.id, businessId, 'edit_jobs');
if (!hasPermission) {
  return next(new AppError('Insufficient permissions', 403));
}
```

### Team Member Model Methods
```javascript
// Check single permission
const canEdit = teamMember.hasPermission('edit_jobs');

// Check multiple permissions (ANY)
const canManage = teamMember.hasAnyPermission(['edit_jobs', 'delete_jobs']);

// Check multiple permissions (ALL)
const canFullyManage = teamMember.hasAllPermissions(['edit_jobs', 'delete_jobs', 'post_jobs']);
```

## Security Considerations

1. **Business Context**: All permissions are evaluated within a specific business context
2. **Role Hierarchy**: Higher roles inherit permissions from lower roles
3. **Explicit Permissions**: Team members can have explicit permissions beyond their role
4. **Route Protection**: All sensitive endpoints are protected with appropriate permission checks
5. **Audit Trail**: Permission checks are logged for security monitoring

## Error Handling

### Common Permission Errors
- `403 Forbidden`: User lacks required permissions
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Business or resource not found

### Error Response Format
```json
{
  "status": "error",
  "message": "Insufficient permissions to access this resource",
  "code": 403
}
```

## Best Practices

1. **Principle of Least Privilege**: Grant minimum permissions necessary
2. **Regular Review**: Periodically review and update permissions
3. **Role-Based Assignment**: Use roles as the primary permission mechanism
4. **Explicit Overrides**: Use explicit permissions sparingly for special cases
5. **Business Context**: Always verify permissions within the correct business context
6. **Audit Logging**: Monitor permission usage for security analysis

## Integration with Frontend

### Flutter Service Alignment
The Flutter `PermissionService` should align with these backend permissions. Use the `mapTeamAccessToBusinessPermissions` function to convert boolean flags to permission strings.

### API Response Format
```json
{
  "user": {
    "id": "user123",
    "permissions": ["create_jobs", "edit_jobs", "view_applications"],
    "role": "manager",
    "business": "business456"
  }
}
```

---

*Last Updated: October 4, 2025*  
*Version: 1.0*