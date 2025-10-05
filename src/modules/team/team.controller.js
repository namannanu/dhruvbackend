const TeamAccess = require('./teamAccess.model');
const User = require('../users/user.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

// Grant team access to a user for managing another user's data
exports.grantAccess = catchAsync(async (req, res) => {
  const { userEmail, accessLevel, permissions, restrictions, expiresAt, reason } = req.body;
  
  if (!userEmail || !accessLevel) {
    throw new AppError('userEmail and accessLevel are required', 400);
  }
  
  // Get employeeId from JWT token (current authenticated user)
  const employeeId = req.user._id;
  
  // Verify the target user exists by email
  const targetUser = await User.findOne({ email: userEmail.toLowerCase() });
  if (!targetUser) {
    throw new AppError('Target user not found with provided email', 404);
  }
  
  // Current user is the employee whose data will be managed
  const managedUser = req.user;
  
  // Current user is the employee whose data will be managed
  const managedUser = req.user;
  
  // Check if the current user has permission to grant access to their own data
  // Note: Users can always grant access to their own data
  const isOwner = true; // Current user is always the owner of their own data
  
  // Check if access already exists
  const existingAccess = await TeamAccess.findOne({
    userEmail: userEmail.toLowerCase(),
    employeeId: employeeId,
    status: { $in: ['active', 'suspended'] }
  });
  
  if (existingAccess) {
    throw new AppError('Access already granted to this user', 400);
  }
  
  // Create team access
  const teamAccess = await TeamAccess.create({
    userEmail: userEmail.toLowerCase(),
    employeeId: employeeId,
    originalUser: managedUser._id,
    grantedBy: req.user._id,
    accessLevel,
    permissions: permissions || {}, // Will be set by pre-save middleware based on accessLevel
    restrictions: restrictions || {},
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    reason: reason || `${accessLevel.charAt(0).toUpperCase() + accessLevel.slice(1)} access granted`
  });
  
  await teamAccess.populate([
    { path: 'user', select: 'firstName lastName email' },
    { path: 'originalUser', select: 'firstName lastName email' },
    { path: 'grantedBy', select: 'firstName lastName email' }
  ]);
  
  res.status(201).json({
    status: 'success',
    message: `${accessLevel} access granted successfully`,
    data: {
      teamAccess,
      summary: {
        grantedTo: `${targetUser.firstName} ${targetUser.lastName}`,
        managedUserData: `${managedUser.firstName} ${managedUser.lastName} (${employeeId})`,
        accessLevel: accessLevel,
        permissions: teamAccess.permissionSummary,
        expiresAt: teamAccess.expiresAt
      }
    }
  });
});

// List all team members who have access to current user's data
exports.listMyTeamMembers = catchAsync(async (req, res) => {
  const teamMembers = await TeamAccess.find({
    employeeId: req.user._id,
    status: { $in: ['active', 'suspended'] }
  })
  .populate('user', 'firstName lastName email')
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

// List all employees current user can manage
exports.listManagedAccess = catchAsync(async (req, res) => {
  const managedAccess = await TeamAccess.find({
    userEmail: req.user.email.toLowerCase(),
    status: 'active'
  })
  .populate('originalUser', 'firstName lastName email')
  .populate('grantedBy', 'firstName lastName email')
  .sort({ createdAt: -1 });
  
  const validAccess = managedAccess.filter(access => access.isAccessValid);
  
  res.status(200).json({
    status: 'success',
    results: validAccess.length,
    data: {
      managedAccess: validAccess.map(access => ({
        employeeId: access.employeeId,
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
  const { accessLevel, permissions, restrictions, expiresAt } = req.body;
  
  const teamAccess = await TeamAccess.findById(teamAccessId);
  if (!teamAccess) {
    throw new AppError('Team access not found', 404);
  }
  
  // Check if current user can modify this access
  const managedUser = await User.findById(teamAccess.employeeId);
  const isOwner = managedUser._id.toString() === req.user._id.toString();
  let hasManagePermission = false;
  
  if (!isOwner) {
    const currentUserAccess = await TeamAccess.checkAccess(
      req.user.email, 
      teamAccess.employeeId, 
      'canManageTeam'
    );
    hasManagePermission = currentUserAccess.hasAccess;
  }
  
  if (!isOwner && !hasManagePermission) {
    throw new AppError('You do not have permission to modify this team access', 403);
  }
  
  // Update the access
  if (accessLevel) teamAccess.accessLevel = accessLevel;
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
  const managedUser = await User.findById(teamAccess.employeeId);
  const isOwner = managedUser._id.toString() === req.user._id.toString();
  let hasManagePermission = false;
  
  if (!isOwner) {
    const currentUserAccess = await TeamAccess.checkAccess(
      req.user.email, 
      teamAccess.employeeId, 
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

// Check if current user has access to manage data for a specific employee
exports.checkAccess = catchAsync(async (req, res) => {
  const { employeeId } = req.params;
  const { permission } = req.query;
  
  // Check if user is trying to access their own data
  if (req.user._id.toString() === employeeId) {
    return res.status(200).json({
      status: 'success',
      data: {
        hasAccess: true,
        reason: 'Owner access',
        accessLevel: 'owner',
        permissions: 'all'
      }
    });
  }
  
  // Check team access
  const accessCheck = await TeamAccess.checkAccess(
    req.user.email, 
    employeeId, 
    permission
  );
  
  res.status(200).json({
    status: 'success',
    data: accessCheck
  });
});

// Get comprehensive access report for an employee
exports.getAccessReport = catchAsync(async (req, res) => {
  const { employeeId } = req.params;
  
  // Verify employee exists
  const managedUser = await User.findById(employeeId);
  if (!managedUser) {
    throw new AppError('Employee not found with provided ID', 404);
  }
  
  // Check if current user has access to view this report
  const isOwner = managedUser._id.toString() === req.user._id.toString();
  let hasAccess = false;
  
  if (!isOwner) {
    const accessCheck = await TeamAccess.checkAccess(
      req.user.email, 
      employeeId, 
      'canViewAttendance'
    );
    hasAccess = accessCheck.hasAccess;
  }
  
  if (!isOwner && !hasAccess) {
    throw new AppError('You do not have permission to view this access report', 403);
  }
  
  // Get all team members with access to this employee's data
  const teamMembers = await TeamAccess.find({
    employeeId: employeeId,
    status: { $in: ['active', 'suspended'] }
  })
  .populate('user', 'firstName lastName email')
  .populate('grantedBy', 'firstName lastName email')
  .sort({ lastAccessedAt: -1 });
  
  const report = {
    managedUser: {
      id: managedUser._id,
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