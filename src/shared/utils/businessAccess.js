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

  if (!teamMember) {
    throw new AppError('You are not a team member of this business', 403);
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
