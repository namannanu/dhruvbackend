/**
 * Permission-based middleware for API route protection
 * Validates user permissions before allowing access to specific endpoints
 */

const AppError = require('../utils/appError');
const User = require('../../modules/users/user.model');
const Business = require('../../modules/businesses/business.model');
const TeamMember = require('../../modules/businesses/teamMember.model');

// All available permissions in the system
const ALL_PERMISSIONS = {
  // Business Management
  'create_business': 'Create Business',
  'edit_business': 'Edit Business',
  'delete_business': 'Delete Business',
  'view_business_analytics': 'View Business Analytics',
  
  // Job Management
  'create_jobs': 'Create Jobs',
  'edit_jobs': 'Edit Jobs',
  'delete_jobs': 'Delete Jobs',
  'view_jobs': 'View Jobs',
  'post_jobs': 'Post Jobs',
  
  // Worker & Application Management
  'hire_workers': 'Hire Workers',
  'fire_workers': 'Fire Workers',
  'view_applications': 'View Applications',
  'manage_applications': 'Manage Applications',
  'approve_applications': 'Approve Applications',
  'reject_applications': 'Reject Applications',
  
  // Schedule & Attendance Management
  'create_schedules': 'Create Schedules',
  'edit_schedules': 'Edit Schedules',
  'delete_schedules': 'Delete Schedules',
  'manage_schedules': 'Manage Schedules',
  'view_attendance': 'View Attendance',
  'manage_attendance': 'Manage Attendance',
  'approve_attendance': 'Approve Attendance',
  
  // Payment & Financial Management
  'view_payments': 'View Payments',
  'manage_payments': 'Manage Payments',
  'process_payments': 'Process Payments',
  'view_financial_reports': 'View Financial Reports',
  
  // Team Management
  'invite_team_members': 'Invite Team Members',
  'edit_team_members': 'Edit Team Members',
  'view_team_members': 'View Team Members',
  'manage_team_members': 'Manage Team Members',
  'remove_team_members': 'Remove Team Members',
  'manage_permissions': 'Manage Permissions',
  
  // Communication & Messaging
  'view_messages': 'View Messages',
  'send_messages': 'Send Messages',
  'view_notifications': 'View Notifications',
  'send_notifications': 'Send Notifications',
  
  // Business Profile & Settings
  'view_business_profile': 'View Business Profile',
  'edit_business_profile': 'Edit Business Profile',
  'view_dashboard': 'View Dashboard',
  'view_schedules': 'View Schedules',
  'manage_schedules': 'Manage Schedules',
  'view_budget': 'View Budget',
  'manage_budget': 'Manage Budget',
  'manage_subscriptions': 'Manage Subscriptions',
  
  // Analytics & Reporting
  'view_analytics': 'View Analytics',
  'view_reports': 'View Reports',
  'export_data': 'Export Data',
  
  // System Administration
  'manage_settings': 'Manage Settings',
  'view_audit_logs': 'View Audit Logs',
  'manage_integrations': 'Manage Integrations',
};

// Role-based default permissions
const ROLE_PERMISSIONS = {
  'owner': Object.keys(ALL_PERMISSIONS), // Owners get all permissions
  'admin': Object.keys(ALL_PERMISSIONS), // Admins get all permissions
  'manager': [
    // Business Management
    'edit_business',
    'view_business_analytics',
    'view_business_profile',
    'edit_business_profile',
    'view_dashboard',
    // Job Management
    'create_jobs',
    'edit_jobs',
    'view_jobs',
    'post_jobs',
    // Worker & Application Management
    'hire_workers',
    'view_applications',
    'manage_applications',
    'approve_applications',
    'reject_applications',
    // Schedule & Attendance Management
    'create_schedules',
    'edit_schedules',
    'manage_schedules',
    'view_schedules',
    'view_attendance',
    'manage_attendance',
    'approve_attendance',
    // Payment & Financial Management
    'view_payments',
    'manage_payments',
    'process_payments',
    'view_financial_reports',
    'view_budget',
    'manage_budget',
    // Team Management
    'invite_team_members',
    'edit_team_members',
    'view_team_members',
    'manage_team_members',
    // Communication & Messaging
    'view_messages',
    'send_messages',
    'view_notifications',
    'send_notifications',
    // Analytics & Reporting
    'view_analytics',
    'view_reports',
    'export_data',
  ],
  'supervisor': [
    // Business Profile
    'view_business_profile',
    'view_dashboard',
    // Job Management
    'view_jobs',
    'post_jobs',
    // Worker & Application Management
    'view_applications',
    'manage_applications',
    // Schedule & Attendance Management
    'create_schedules',
    'edit_schedules',
    'manage_schedules',
    'view_schedules',
    'view_attendance',
    'manage_attendance',
    // Payment & Financial Management
    'view_payments',
    'view_budget',
    // Team Management
    'view_team_members',
    // Communication & Messaging
    'view_messages',
    'send_messages',
    'view_notifications',
    // Analytics & Reporting
    'view_analytics',
    'view_reports',
  ],
  'staff': [
    // Business Profile
    'view_business_profile',
    'view_dashboard',
    // Job Management
    'view_jobs',
    // Worker & Application Management
    'view_applications',
    // Schedule & Attendance Management
    'view_schedules',
    'view_attendance',
    // Team Management
    'view_team_members',
    // Communication & Messaging
    'view_messages',
    'send_messages',
    'view_notifications',
    // Analytics & Reporting
    'view_analytics',
  ],
};

// API endpoint to permission mapping
const ENDPOINT_PERMISSIONS = {
  // Business endpoints
  'POST:/api/businesses': ['create_business'],
  'PUT:/api/businesses': ['edit_business'],
  'PATCH:/api/businesses': ['edit_business'],
  'DELETE:/api/businesses': ['delete_business'],
  'GET:/api/businesses/analytics': ['view_business_analytics'],
  
  // Job endpoints
  'POST:/api/jobs': ['create_jobs'],
  'PUT:/api/jobs': ['edit_jobs'],
  'PATCH:/api/jobs': ['edit_jobs'],
  'DELETE:/api/jobs': ['delete_jobs'],
  'GET:/api/jobs': ['view_jobs'],
  'POST:/api/jobs/publish': ['post_jobs'],
  
  // Application endpoints
  'GET:/api/applications': ['view_applications'],
  'PUT:/api/applications': ['manage_applications'],
  'PATCH:/api/applications': ['manage_applications'],
  'POST:/api/applications/approve': ['approve_applications'],
  'POST:/api/applications/reject': ['reject_applications'],
  
  // Attendance endpoints
  'GET:/api/attendance': ['view_attendance'],
  'PUT:/api/attendance': ['manage_attendance'],
  'PATCH:/api/attendance': ['manage_attendance'],
  'POST:/api/attendance/approve': ['approve_attendance'],
  
  // Schedule endpoints
  'POST:/api/schedules': ['create_schedules'],
  'PUT:/api/schedules': ['edit_schedules'],
  'PATCH:/api/schedules': ['edit_schedules'],
  'DELETE:/api/schedules': ['delete_schedules'],
  'GET:/api/schedules': ['manage_schedules'],
  
  // Team endpoints
  'POST:/api/team/invite': ['invite_team_members'],
  'PUT:/api/team': ['edit_team_members'],
  'PATCH:/api/team': ['edit_team_members'],
  'DELETE:/api/team': ['remove_team_members'],
  'PUT:/api/team/permissions': ['manage_permissions'],
  
  // Payment endpoints
  'GET:/api/payments': ['view_payments'],
  'PUT:/api/payments': ['manage_payments'],
  'PATCH:/api/payments': ['manage_payments'],
  'POST:/api/payments/process': ['process_payments'],
  'GET:/api/reports/financial': ['view_financial_reports'],
  
  // Analytics endpoints
  'GET:/api/analytics': ['view_analytics'],
  'GET:/api/reports': ['view_reports'],
  'POST:/api/export': ['export_data'],
};

/**
 * Get user's permissions based on their role and team membership
 */
async function getUserPermissions(userId, businessId) {
  try {
    console.log(`Getting permissions for user ${userId} and business ${businessId}`);
    
    // For business creation, check TeamAccess without requiring business context
    const User = require('../../modules/users/user.model');
    const TeamAccess = require('../../modules/team/teamAccess.model');
    
    const user = await User.findById(userId);
    if (user && user.email) {
      const teamAccess = await TeamAccess.findOne({
        userEmail: user.email.toLowerCase(),
        status: 'active'
      });
      
      if (teamAccess && teamAccess.isAccessValid) {
        console.log(`Found team access with level ${teamAccess.accessLevel} for user ${userId}`);
        console.log('TeamAccess permissions object:', teamAccess.permissions);
        console.log('Specific view_jobs permission:', {
          canViewJobs: teamAccess.permissions?.canViewJobs,
          effectiveCanViewJobs: teamAccess.effectivePermissions?.canViewJobs
        });
        
        // Check business context and scope
        const permissions = [];
        
        // Handle different access scopes
        if (teamAccess.accessScope === 'independent_operator') {
          // Independent operators can create and manage their own businesses
          if (teamAccess.permissions.canCreateBusiness) permissions.push('create_business');
          if (teamAccess.permissions.canEditBusiness) permissions.push('edit_business');
          if (teamAccess.permissions.canDeleteBusiness) permissions.push('delete_business');
          if (teamAccess.permissions.canViewBusiness) permissions.push('view_business');
          
          // Check if the business belongs to this user
          if (businessId) {
            const Business = require('../../modules/businesses/business.model');
            const business = await Business.findById(businessId);
            if (business && business.owner.toString() === userId.toString()) {
              // User owns this business, grant full permissions
              console.log('User owns this business - granting full permissions');
            } else {
              // User doesn't own this business, check if they have specific access
              if (!teamAccess.businessContext?.allBusinesses && 
                  teamAccess.businessContext?.businessId?.toString() !== businessId) {
                console.log('User does not have access to this specific business');
                return []; // No access to businesses they don't own and aren't specifically granted access to
              }
            }
          }
        } else if (teamAccess.accessScope === 'business_specific') {
          // Access is limited to specific business
          if (businessId && teamAccess.businessContext?.businessId?.toString() !== businessId) {
            console.log('Access is business-specific but wrong business ID');
            return [];
          }
        } else if (teamAccess.accessScope === 'all_owner_businesses') {
          // Access to all businesses owned by the original user
          if (businessId) {
            const Business = require('../../modules/businesses/business.model');
            const business = await Business.findById(businessId);
            if (business && business.owner.toString() !== teamAccess.originalUser.toString()) {
              console.log('Business not owned by the original user');
              return [];
            }
          }
        }
        
        // Add standard permissions based on TeamAccess
        if (teamAccess.permissions.canCreateBusiness) permissions.push('create_business');
        if (teamAccess.permissions.canEditBusiness) permissions.push('edit_business');
        if (teamAccess.permissions.canDeleteBusiness) permissions.push('delete_business');
        if (teamAccess.permissions.canViewBusiness) permissions.push('view_business');
        if (teamAccess.permissions.canCreateJobs) permissions.push('create_jobs');
        if (teamAccess.permissions.canEditJobs) permissions.push('edit_jobs');
        if (teamAccess.permissions.canDeleteJobs) permissions.push('delete_jobs');
        if (teamAccess.permissions.canViewJobs) permissions.push('view_jobs');
        if (teamAccess.permissions.canCreateAttendance) permissions.push('create_attendance');
        if (teamAccess.permissions.canEditAttendance) permissions.push('edit_attendance');
        if (teamAccess.permissions.canViewAttendance) permissions.push('view_attendance');
        
        // Worker permissions - THIS WAS MISSING!
        if (teamAccess.permissions.canHireWorkers) permissions.push('hire_workers');
        if (teamAccess.permissions.canFireWorkers) permissions.push('fire_workers');
        if (teamAccess.permissions.canManageWorkers) permissions.push('manage_workers');
        if (teamAccess.permissions.canViewWorkers) permissions.push('view_workers');
        
        // Application permissions
        if (teamAccess.permissions.canViewApplications) permissions.push('view_applications');
        if (teamAccess.permissions.canManageApplications) permissions.push('manage_applications');
        
        // Shift permissions
        if (teamAccess.permissions.canCreateShifts) permissions.push('create_shifts');
        if (teamAccess.permissions.canEditShifts) permissions.push('edit_shifts');
        if (teamAccess.permissions.canDeleteShifts) permissions.push('delete_shifts');
        if (teamAccess.permissions.canViewShifts) permissions.push('view_shifts');
        
        // Schedule permissions (mapped from shift permissions)
        if (teamAccess.permissions.canCreateShifts) permissions.push('create_schedules');
        if (teamAccess.permissions.canEditShifts) permissions.push('edit_schedules');
        if (teamAccess.permissions.canDeleteShifts) permissions.push('delete_schedules');
        if (teamAccess.permissions.canViewShifts) permissions.push('view_schedules');
        if (teamAccess.permissions.canManageShifts) permissions.push('manage_schedules');
        
        // Team permissions
        if (teamAccess.permissions.canViewTeam) permissions.push('view_team');
        if (teamAccess.permissions.canManageTeam) permissions.push('manage_team');
        if (teamAccess.permissions.canGrantAccess) permissions.push('grant_access');
        
        // Payment permissions
        if (teamAccess.permissions.canViewPayments) permissions.push('view_payments');
        if (teamAccess.permissions.canManagePayments) permissions.push('manage_payments');
        if (teamAccess.permissions.canProcessPayments) permissions.push('process_payments');
        
        // Budget permissions
        if (teamAccess.permissions.canViewBudgets) permissions.push('view_budgets');
        if (teamAccess.permissions.canManageBudgets) permissions.push('manage_budgets');
        
        // Analytics permissions
        if (teamAccess.permissions.canViewAnalytics) permissions.push('view_analytics');
        if (teamAccess.permissions.canViewReports) permissions.push('view_reports');
        if (teamAccess.permissions.canExportData) permissions.push('export_data');
        
        console.log(`Using TeamAccess permissions for user ${userId}:`, permissions);
        return permissions;
      }
    }
    
    // If no TeamAccess found, check if user is business owner (when businessId is provided)
    if (businessId) {
      const business = await Business.findById(businessId);
      if (business && business.owner && business.owner.toString() === userId.toString()) {
        console.log(`User ${userId} is owner of business ${businessId} - granting all permissions`);
        return Object.keys(ALL_PERMISSIONS); // Owner gets all permissions
      }
    }

    // Check if user is a team member of this business (legacy system)
    if (businessId) {
      const teamMember = await TeamMember.findOne({
        user: userId,
        business: businessId,
        active: true
      });

      if (teamMember) {
        console.log(`Found team member with role ${teamMember.role} for user ${userId}`);
        
        // If user is admin, return all permissions
        if (teamMember.role === 'admin') {
          return Object.keys(ALL_PERMISSIONS);
        }
        
        // If user has specific permissions assigned, use those
        if (teamMember.permissions && teamMember.permissions.length > 0) {
          console.log(`Using custom permissions for user ${userId}:`, teamMember.permissions);
          return teamMember.permissions;
        }
        
        // Fall back to role-based permissions
        const rolePermissions = ROLE_PERMISSIONS[teamMember.role] || [];
        console.log(`Using role-based permissions for ${teamMember.role}:`, rolePermissions);
        return rolePermissions;
      }
    }

    console.log(`No permissions found for user ${userId} in business ${businessId}`);
    // If not a team member and not owner, return empty permissions
    return [];
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Check if user has a specific permission
 */
function hasPermission(userPermissions, requiredPermission) {
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has any of the required permissions
 */
function hasAnyPermission(userPermissions, requiredPermissions) {
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  );
}

/**
 * Check if user has all of the required permissions
 */
function hasAllPermissions(userPermissions, requiredPermissions) {
  return requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  );
}

/**
 * Get business ID from request context
 */
async function getBusinessIdFromRequest(req) {
  try {
    // 1. Check JWT token payload first (for team members with active business context)
    if (req.tokenPayload && req.tokenPayload.businessId) {
      return req.tokenPayload.businessId;
    }

    // 2. Check URL parameters
    if (req.params.businessId) {
      return req.params.businessId;
    }

    // 3. Check if employerId parameter maps to a business
    if (req.params.employerId) {
      const business = await Business.findOne({ owner: req.params.employerId });
      if (business) {
        return business._id.toString();
      }
    }

    // 4. Check if jobId parameter exists and fetch business from job
    if (req.params.jobId) {
      const Job = require('../../modules/jobs/job.model');
      const job = await Job.findById(req.params.jobId).select('business');
      if (job && job.business) {
        return job.business.toString();
      }
    }

    // 5. Check if applicationId parameter exists and fetch business from application's job
    if (req.params.applicationId) {
      const Application = require('../../modules/applications/application.model');
      const application = await Application.findById(req.params.applicationId).populate('job', 'business');
      if (application && application.job && application.job.business) {
        return application.job.business.toString();
      }
    }

    // 6. Check body and query parameters
    if (req.body.businessId) {
      return req.body.businessId;
    }
    
    if (req.query.businessId) {
      return req.query.businessId;
    }

    // 7. Check headers
    if (req.headers['x-business-id']) {
      return req.headers['x-business-id'];
    }

    // 8. If user is an employer, find their primary business
    if (req.user && req.user.userType === 'employer') {
      const business = await Business.findOne({ owner: req.user.id || req.user._id });
      if (business) {
        return business._id.toString();
      }
    }

    // 7. For /me endpoints, try to find business by user ID
    if (req.path.includes('/me') && req.user) {
      const business = await Business.findOne({ owner: req.user.id || req.user._id });
      if (business) {
        return business._id.toString();
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting business ID from request:', error);
    return null;
  }
}

/**
 * Middleware to check if user has required permissions for an endpoint
 */
function requirePermissions(permissions, options = {}) {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return next(new AppError('Authentication required', 401));
      }

      // Get business ID from request
      const businessId = await getBusinessIdFromRequest(req);

      if (!businessId && options.requireBusinessId !== false) {
        return next(new AppError('Business ID required', 400));
      }

      // Get user permissions
      const userPermissions = await getUserPermissions(req.user.id, businessId);

      // Check permissions
      let hasAccess = false;
      if (Array.isArray(permissions)) {
        // Multiple permissions - check based on options
        hasAccess = options.requireAll 
          ? hasAllPermissions(userPermissions, permissions)
          : hasAnyPermission(userPermissions, permissions);
      } else {
        // Single permission
        hasAccess = hasPermission(userPermissions, permissions);
      }

      if (!hasAccess) {
        return next(new AppError(
          `Insufficient permissions. Required: ${Array.isArray(permissions) ? permissions.join(', ') : permissions}`,
          403
        ));
      }

      // Add permissions and business ID to request for use in controllers
      req.userPermissions = userPermissions;
      req.businessId = businessId;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      next(new AppError('Permission check failed', 500));
    }
  };
}

/**
 * Middleware to automatically check permissions based on endpoint
 */
function autoCheckPermissions(options = {}) {
  return async (req, res, next) => {
    try {
      const method = req.method;
      const path = req.route?.path || req.path;
      const key = `${method}:${path}`;
      
      // Get required permissions for this endpoint
      const requiredPermissions = ENDPOINT_PERMISSIONS[key];
      
      if (!requiredPermissions) {
        // No specific permissions required for this endpoint
        return next();
      }

      // Use the requirePermissions middleware
      const permissionMiddleware = requirePermissions(requiredPermissions, options);
      return permissionMiddleware(req, res, next);
    } catch (error) {
      console.error('Auto permission check error:', error);
      next(new AppError('Permission check failed', 500));
    }
  };
}

/**
 * Helper function to check permissions in controllers
 */
async function checkUserPermission(userId, businessId, permission) {
  try {
    const userPermissions = await getUserPermissions(userId, businessId);
    return hasPermission(userPermissions, permission);
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
}

/**
 * Helper function to get all permissions for a role
 */
function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Validate that permissions are valid
 */
function validatePermissions(permissions) {
  if (!Array.isArray(permissions)) {
    return false;
  }
  
  return permissions.every(permission => 
    Object.keys(ALL_PERMISSIONS).includes(permission)
  );
}

/**
 * Maps team access boolean permissions to business permission strings
 * @param {Object} teamAccess - Object containing boolean permission flags
 * @returns {Array} Array of business permission strings
 */
const mapTeamAccessToBusinessPermissions = (teamAccess) => {
  const flags = teamAccess?.permissions ? { ...teamAccess.permissions } : { ...teamAccess };
  const permissions = [];
  
  // Job permissions
  if (flags.canCreateJobs) permissions.push('create_jobs');
  if (flags.canEditJobs) permissions.push('edit_jobs');
  if (flags.canDeleteJobs) permissions.push('delete_jobs');
  if (flags.canViewJobs) permissions.push('view_jobs');
  
  // Application permissions
  if (flags.canViewApplications) permissions.push('view_applications');
  if (flags.canManageApplications) permissions.push('manage_applications');
  
  // Shift permissions
  if (flags.canCreateShifts) permissions.push('create_shifts');
  if (flags.canEditShifts) permissions.push('edit_shifts');
  if (flags.canDeleteShifts) permissions.push('delete_shifts');
  if (flags.canViewShifts) permissions.push('view_shifts');
  
  // Worker permissions
  if (flags.canViewWorkers) permissions.push('view_workers');
  if (flags.canManageWorkers) permissions.push('manage_workers');
  
  // Team permissions
  if (flags.canViewTeam) permissions.push('view_team_members');
  if (flags.canManageTeam) permissions.push('manage_team_members');
  
  // Business permissions
  if (flags.canEditBusiness) permissions.push('edit_business');
  if (flags.canViewBusiness) permissions.push('view_business');
  
  // Financial permissions
  if (flags.canViewPayments) permissions.push('view_payments');
  if (flags.canManagePayments) permissions.push('manage_payments');
  if (flags.canViewBudgets) permissions.push('view_budgets');
  if (flags.canManageBudgets) permissions.push('manage_budgets');
  
  // Attendance permissions
  if (flags.canViewAttendance) permissions.push('view_attendance');
  if (flags.canManageAttendance) permissions.push('manage_attendance');
  
  return permissions;
};

module.exports = {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  ENDPOINT_PERMISSIONS,
  getUserPermissions,
  getBusinessIdFromRequest,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requirePermissions,
  autoCheckPermissions,
  checkUserPermission,
  getRolePermissions,
  validatePermissions,
  mapTeamAccessToBusinessPermissions,
};
