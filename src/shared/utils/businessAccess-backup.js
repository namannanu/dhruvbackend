const AppError = require('./appError');
const Business = require('../../modules/businesses/business.model');
const TeamMember = require('../../modules/businesses/teamMember.model');
const TeamAccess = require('../../modules/team/teamAccess.model');
const {
  ROLE_PERMISSIONS,
} = require('../middlewares/permissionMiddleware');

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.toString) return value.toString();
  return null;
};

const normalizePermissions = (permissions) => {
  if (!permissions) return [];
  if (Array.isArray(permissions)) {
    return permissions.filter(Boolean);
  }
  return [permissions];
};

/**
 * Ensure the current user can access the requested business.
 * Allows both business owners and active team members.
 */
async function ensureBusinessAccess({
  user,
  businessId,
  requiredPermissions,
  requireActiveTeamMember = true,
}) {
  const normalizedBusinessId = normalizeId(businessId);
  if (!normalizedBusinessId) {
    throw new AppError('Business ID is required', 400);
  }

  const business = await Business.findById(normalizedBusinessId);
  if (!business) {
    throw new AppError('Business not found', 404);
  }

  const userId = normalizeId(user._id || user.id);
  if (!userId) {
    throw new AppError('User ID missing from request', 401);
  }

  const isOwner = normalizeId(business.owner) === userId;
  if (isOwner) {
    return { business, isOwner: true, teamMember: null };
  }

  const teamMember = await TeamMember.findOne({
    business: business._id,
    user: userId,
  });

  // If no traditional team member found, check TeamAccess records
  if (!teamMember) {
    const teamAccess = await TeamAccess.findOne({
      $and: [
        {
          $or: [
            { employeeId: userId },
            { userEmail: user.email }
          ]
        },
        {
          status: { $in: ['active', 'pending'] }
        },
        {view_jobs
          $or: [
            { 'businessContext.businessId': business._id },
            { 'businessContext.allBusinesses': true },
            { accessScope: 'all_owner_businesses' }
          ]
        }
      ]
    });
    
    if (!teamAccess) {
      throw new AppError('You are not a team member of this business', 403);
    }

    // Check if TeamAccess has the required permissions
    const permissionsToCheck = normalizePermissions(requiredPermissions);
    
    if (permissionsToCheck.length) {
      // Get permissions from the most likely sources
      const permissions = teamAccess.effectivePermissions || teamAccess.permissions || teamAccess;
      
      // Special debug for hire_workers permission
      if (permissionsToCheck.includes('hire_workers')) {
        console.log('=== HIRE WORKERS PERMISSION DEBUG ===');
        console.log('Required permission: hire_workers');
        console.log('TeamAccess canHireWorkers:', teamAccess.canHireWorkers);
        console.log('Permissions object canHireWorkers:', permissions.canHireWorkers);
        console.log('EffectivePermissions canHireWorkers:', teamAccess.effectivePermissions?.canHireWorkers);
        console.log('Direct permissions canHireWorkers:', teamAccess.permissions?.canHireWorkers);
      }
      
      const hasRequiredPermissions = permissionsToCheck.every(permission => {
        let hasPermission;
        switch (permission) {
          // Job permissions
          case 'create_jobs': hasPermission = permissions.canCreateJobs; break;
          case 'edit_jobs': hasPermission = permissions.canEditJobs; break;
          case 'delete_jobs': hasPermission = permissions.canDeleteJobs; break;
          case 'view_jobs': hasPermission = permissions.canViewJobs; break;
          
          // Business permissions
          case 'create_business': hasPermission = permissions.canCreateBusiness; break;
          case 'edit_business': hasPermission = permissions.canEditBusiness; break;
          case 'delete_business': hasPermission = permissions.canDeleteBusiness; break;
          case 'view_business': hasPermission = permissions.canViewBusiness; break;
          
          // Worker permissions
          case 'hire_workers': hasPermission = permissions.canHireWorkers; break;
          case 'fire_workers': hasPermission = permissions.canFireWorkers; break;
          case 'manage_workers': hasPermission = permissions.canManageWorkers; break;
          case 'view_workers': hasPermission = permissions.canViewWorkers; break;
          
          // Application permissions
          case 'view_applications': hasPermission = permissions.canViewApplications; break;
          case 'manage_applications': hasPermission = permissions.canManageApplications; break;
          
          // Shift permissions
          case 'create_shifts': hasPermission = permissions.canCreateShifts; break;
          case 'edit_shifts': hasPermission = permissions.canEditShifts; break;
          case 'delete_shifts': hasPermission = permissions.canDeleteShifts; break;
          case 'view_shifts': hasPermission = permissions.canViewShifts; break;
          
          // Team permissions
          case 'view_team': hasPermission = permissions.canViewTeam; break;
          case 'manage_team': hasPermission = permissions.canManageTeam; break;
          case 'grant_access': hasPermission = permissions.canGrantAccess; break;
          
          // Attendance permissions
          case 'create_attendance': hasPermission = permissions.canCreateAttendance; break;
          case 'edit_attendance': hasPermission = permissions.canEditAttendance; break;
          case 'view_attendance': hasPermission = permissions.canViewAttendance; break;
          case 'manage_attendance': hasPermission = permissions.canManageAttendance; break;
          
          // Employment permissions
          case 'view_employment': hasPermission = permissions.canViewEmployment; break;
          case 'manage_employment': hasPermission = permissions.canManageEmployment; break;
          
          // Payment permissions
          case 'view_payments': hasPermission = permissions.canViewPayments; break;
          case 'manage_payments': hasPermission = permissions.canManagePayments; break;
          case 'process_payments': hasPermission = permissions.canProcessPayments; break;
          
          // Budget permissions
          case 'view_budgets': hasPermission = permissions.canViewBudgets; break;
          case 'manage_budgets': hasPermission = permissions.canManageBudgets; break;
          
          // Analytics permissions
          case 'view_analytics': hasPermission = permissions.canViewAnalytics; break;
          case 'view_reports': hasPermission = permissions.canViewReports; break;
          case 'export_data': hasPermission = permissions.canExportData; break;
          
          default: hasPermission = false;
        }
        
        if (permission === 'hire_workers') {
          console.log(`Final hire_workers permission result: ${hasPermission}`);
        }
        
        return hasPermission;
      });
      
      if (!hasRequiredPermissions) {
        console.log('Permission check FAILED for:', permissionsToCheck);
        throw new AppError('Insufficient permissions for this business operation', 403);
      }
    }

    // For allBusinesses access, verify the business belongs to the managed user
    if (teamAccess.businessContext?.allBusinesses) {
      const managedUserId = teamAccess.managedUser?._id || teamAccess.originalUser;
      console.log('Checking allBusinesses access - managed user:', managedUserId, 'business owner:', business.owner);
      
      if (managedUserId && normalizeId(business.owner) !== normalizeId(managedUserId)) {
        throw new AppError('This business does not belong to the user you have access to manage', 403);
      }
    }

    return { business, isOwner: false, teamMember: null, teamAccess };
  }

  if (requireActiveTeamMember && teamMember.active === false) {
    throw new AppError('This team member is inactive', 403);
  }

  const permissionsToCheck = normalizePermissions(requiredPermissions);
  const role = (teamMember.role || '').toLowerCase();
  const hasFullRoleAccess = role === 'owner' || role === 'admin';
  const rolePermissions = Array.isArray(ROLE_PERMISSIONS?.[role])
    ? ROLE_PERMISSIONS[role]
    : [];

  if (permissionsToCheck.length && !hasFullRoleAccess) {
    const permissionSet = new Set([
      ...(teamMember.permissions || []),
      ...rolePermissions,
    ]);

    const missing = permissionsToCheck.filter(
      (permission) => !permissionSet.has(permission)
    );

    if (missing.length) {
      throw new AppError('Insufficient permissions for this business', 403);
    }
  }

  return { business, isOwner: false, teamMember };
}

/**
 * Retrieve the set of business IDs the user can access (owned, team member, or through TeamAccess).
 */
async function getAccessibleBusinessIds(user) {
  const userId = normalizeId(user._id || user.id);
  if (!userId) {
    return new Set();
  }

  const [ownedBusinesses, teamMemberships, teamAccessRecords] = await Promise.all([
    Business.find({ owner: userId }).select('_id'),
    TeamMember.find({ user: userId, active: true }).select('business'),
    TeamAccess.find({
      $or: [
        { employeeId: userId },
        { userEmail: user.email }
      ],
      status: { $in: ['active', 'pending'] }
    }).populate('managedUser originalUser')
  ]);

  const ids = new Set();
  
  // Add owned businesses
  ownedBusinesses.forEach((business) => {
    const id = normalizeId(business._id);
    if (id) ids.add(id);
  });

  // Add team memberships (old system)
  teamMemberships.forEach((member) => {
    const id = normalizeId(member.business);
    if (id) ids.add(id);
  });

  // Add TeamAccess businesses (new system)
  for (const access of teamAccessRecords) {
    if (access.businessContext?.allBusinesses) {
      // If user has access to all businesses of the managed user, get all their businesses
      const managedUserId = access.managedUser?._id || access.originalUser?._id;
      if (managedUserId) {
        const managedUserBusinesses = await Business.find({ owner: managedUserId }).select('_id');
        managedUserBusinesses.forEach((business) => {
          const id = normalizeId(business._id);
          if (id) ids.add(id);
        });
      }
    } else if (access.businessContext?.businessId) {
      // Specific business access
      const id = normalizeId(access.businessContext.businessId);
      if (id) ids.add(id);
    }
  }

  return ids;
}

module.exports = {
  ensureBusinessAccess,
  getAccessibleBusinessIds,
};
