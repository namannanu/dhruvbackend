const TeamAccess = require('./teamAccess.model');
const User = require('../users/user.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

// Grant team access to a user for managing another user's data
exports.grantAccess = catchAsync(async (req, res) => {
  const { targetUserId, managedUserId, role, permissions, restrictions, expiresAt, reason } = req.body;
  
  if (!targetUserId || !managedUserId || !role) {
    throw new AppError('targetUserId, managedUserId, and role are required', 400);
  }
  
  // Verify the target user exists
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new AppError('Target user not found', 404);
  }
  
  // Verify the managed user exists and get their userId
  const managedUser = await User.findOne({ userId: managedUserId });
  if (!managedUser) {
    throw new AppError('Managed user not found with provided userId', 404);
  }
  
  // Check if the current user has permission to grant access to this managed user's data
  // Either they are the owner or they have canGrantAccess permission
  const isOwner = managedUser._id.toString() === req.user._id.toString();
  let hasGrantPermission = false;
  
  if (!isOwner) {
    const currentUserAccess = await TeamAccess.checkAccess(
      req.user._id, 
      managedUserId, 
      'canGrantAccess'
    );
    hasGrantPermission = currentUserAccess.hasAccess;
  }
  
  if (!isOwner && !hasGrantPermission) {
    throw new AppError('You do not have permission to grant access to this user data', 403);
  }
  
  // Check if access already exists
  const existingAccess = await TeamAccess.findOne({
    user: targetUserId,
    managedUserId: managedUserId,
    status: { $in: ['active', 'suspended'] }
  });
  
  if (existingAccess) {
    throw new AppError('Access already granted to this user', 400);
  }
  
  // Create team access
  const teamAccess = await TeamAccess.create({
    user: targetUserId,
    managedUserId: managedUserId,
    originalUser: managedUser._id,
    grantedBy: req.user._id,
    role,
    permissions: permissions || {}, // Will be set by pre-save middleware based on role
    restrictions: restrictions || {},
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    reason: reason || `${role.charAt(0).toUpperCase() + role.slice(1)} access granted`
  });
  
  await teamAccess.populate([
    { path: 'user', select: 'firstName lastName email userId' },
    { path: 'originalUser', select: 'firstName lastName email userId' },
    { path: 'grantedBy', select: 'firstName lastName email' }
  ]);
  
  res.status(201).json({
    status: 'success',
    message: `${role} access granted successfully`,
    data: {
      teamAccess,
      summary: {
        grantedTo: `${targetUser.firstName} ${targetUser.lastName}`,
        managedUserData: `${managedUser.firstName} ${managedUser.lastName} (${managedUserId})`,
        role: role,
        permissions: teamAccess.permissionSummary,
        expiresAt: teamAccess.expiresAt
      }
    }
  });
});

// List all team members who have access to current user's data
exports.listMyTeamMembers = catchAsync(async (req, res) => {
  const teamMembers = await TeamAccess.find({
    managedUserId: req.user.userId,
    status: { $in: ['active', 'suspended'] }
  })
  .populate('user', 'firstName lastName email userId')
  .populate('grantedBy', 'firstName lastName email')
  .sort({ createdAt: -1 });
  
  const activeMembers = teamMembers.filter(member => member.isAccessValid);
  const inactiveMembers = teamMembers.filter(member => !member.isAccessValid);
  
  res.status(200).json({
    status: 'success',
    results: teamMembers.length,
    data: {
      activeMembers,
      inactiveMembers,
      summary: {
        totalMembers: teamMembers.length,
        activeCount: activeMembers.length,
        inactiveCount: inactiveMembers.length
      }
    }
  });
});

// List all userIds current user can manage
exports.listManagedAccess = catchAsync(async (req, res) => {
  const managedAccess = await TeamAccess.find({
    user: req.user._id,
    status: 'active'
  })
  .populate('originalUser', 'firstName lastName email userId')
  .populate('grantedBy', 'firstName lastName email')
  .sort({ createdAt: -1 });
  
  const validAccess = managedAccess.filter(access => access.isAccessValid);
  
  res.status(200).json({
    status: 'success',
    results: validAccess.length,
    data: {
      managedAccess: validAccess.map(access => ({
        managedUserId: access.managedUserId,
        originalUser: access.originalUser,
        role: access.role,
        permissions: access.permissionSummary,
        grantedBy: access.grantedBy,
        grantedAt: access.createdAt,
        lastAccessed: access.lastAccessedAt,
        accessCount: access.accessCount,
        expiresAt: access.expiresAt
      }))
    }
  });
});

// Update team member permissions
exports.updatePermissions = catchAsync(async (req, res) => {
  const { teamAccessId } = req.params;
  const { role, permissions, restrictions, expiresAt } = req.body;
  
  const teamAccess = await TeamAccess.findById(teamAccessId);
  if (!teamAccess) {
    throw new AppError('Team access not found', 404);
  }
  
  // Check if current user can modify this access
  const managedUser = await User.findOne({ userId: teamAccess.managedUserId });
  const isOwner = managedUser._id.toString() === req.user._id.toString();
  let hasManagePermission = false;
  
  if (!isOwner) {
    const currentUserAccess = await TeamAccess.checkAccess(
      req.user._id, 
      teamAccess.managedUserId, 
      'canManageTeam'
    );
    hasManagePermission = currentUserAccess.hasAccess;
  }
  
  if (!isOwner && !hasManagePermission) {
    throw new AppError('You do not have permission to modify this team access', 403);
  }
  
  // Update the access
  if (role) teamAccess.role = role;
  if (permissions) Object.assign(teamAccess.permissions, permissions);
  if (restrictions) Object.assign(teamAccess.restrictions, restrictions);
  if (expiresAt !== undefined) teamAccess.expiresAt = expiresAt ? new Date(expiresAt) : null;
  
  await teamAccess.save();
  await teamAccess.populate([
    { path: 'user', select: 'firstName lastName email' },
    { path: 'originalUser', select: 'firstName lastName email userId' }
  ]);
  
  res.status(200).json({
    status: 'success',
    message: 'Team access updated successfully',
    data: teamAccess
  });
});

// Revoke team access
exports.revokeAccess = catchAsync(async (req, res) => {
  const { teamAccessId } = req.params;
  const { reason } = req.body;
  
  const teamAccess = await TeamAccess.findById(teamAccessId);
  if (!teamAccess) {
    throw new AppError('Team access not found', 404);
  }
  
  // Check if current user can revoke this access
  const managedUser = await User.findOne({ userId: teamAccess.managedUserId });
  const isOwner = managedUser._id.toString() === req.user._id.toString();
  let hasManagePermission = false;
  
  if (!isOwner) {
    const currentUserAccess = await TeamAccess.checkAccess(
      req.user._id, 
      teamAccess.managedUserId, 
      'canManageTeam'
    );
    hasManagePermission = currentUserAccess.hasAccess;
  }
  
  if (!isOwner && !hasManagePermission) {
    throw new AppError('You do not have permission to revoke this team access', 403);
  }
  
  teamAccess.status = 'revoked';
  teamAccess.notes = reason || 'Access revoked';
  await teamAccess.save();
  
  await teamAccess.populate('user', 'firstName lastName email');
  
  res.status(200).json({
    status: 'success',
    message: `Team access revoked for ${teamAccess.user.firstName} ${teamAccess.user.lastName}`,
    data: teamAccess
  });
});

// Check if current user has access to manage data for a specific userId
exports.checkAccess = catchAsync(async (req, res) => {
  const { managedUserId } = req.params;
  const { permission } = req.query;
  
  // Check if user is trying to access their own data
  if (req.user.userId === managedUserId) {
    return res.status(200).json({
      status: 'success',
      data: {
        hasAccess: true,
        reason: 'Owner access',
        role: 'owner',
        permissions: 'all'
      }
    });
  }
  
  // Check team access
  const accessCheck = await TeamAccess.checkAccess(
    req.user._id, 
    managedUserId, 
    permission
  );
  
  res.status(200).json({
    status: 'success',
    data: accessCheck
  });
});

// Get comprehensive access report for a userId
exports.getAccessReport = catchAsync(async (req, res) => {
  const { managedUserId } = req.params;
  
  // Verify managed user exists
  const managedUser = await User.findOne({ userId: managedUserId });
  if (!managedUser) {
    throw new AppError('User not found with provided userId', 404);
  }
  
  // Check if current user has access to view this report
  const isOwner = managedUser._id.toString() === req.user._id.toString();
  let hasAccess = false;
  
  if (!isOwner) {
    const accessCheck = await TeamAccess.checkAccess(
      req.user._id, 
      managedUserId, 
      'canViewAttendance'
    );
    hasAccess = accessCheck.hasAccess;
  }
  
  if (!isOwner && !hasAccess) {
    throw new AppError('You do not have permission to view this access report', 403);
  }
  
  // Get all team members with access to this user's data
  const teamMembers = await TeamAccess.find({
    managedUserId: managedUserId,
    status: { $in: ['active', 'suspended'] }
  })
  .populate('user', 'firstName lastName email userId')
  .populate('grantedBy', 'firstName lastName email')
  .sort({ lastAccessedAt: -1 });
  
  const report = {
    managedUser: {
      userId: managedUser.userId,
      name: `${managedUser.firstName} ${managedUser.lastName}`,
      email: managedUser.email
    },
    teamMembers: teamMembers.map(member => ({
      user: member.user,
      role: member.role,
      permissions: member.permissionSummary,
      status: member.status,
      isValid: member.isAccessValid,
      grantedBy: member.grantedBy,
      grantedAt: member.createdAt,
      lastAccessed: member.lastAccessedAt,
      accessCount: member.accessCount,
      expiresAt: member.expiresAt
    })),
    summary: {
      totalMembers: teamMembers.length,
      activeMembers: teamMembers.filter(m => m.status === 'active' && m.isAccessValid).length,
      suspendedMembers: teamMembers.filter(m => m.status === 'suspended').length,
      expiredMembers: teamMembers.filter(m => m.expiresAt && m.expiresAt < new Date()).length
    }
  };
  
  res.status(200).json({
    status: 'success',
    data: report
  });
});