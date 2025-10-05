const mongoose = require('mongoose');
const TeamAccess = require('./teamAccess.model');
const User = require('../users/user.model');
const Business = require('../businesses/business.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const normalizeEmail = (email) => (email ? email.trim().toLowerCase() : undefined);

const resolveUser = async ({ identifier, email }) => {
  const normalizedEmail = normalizeEmail(email || (identifier?.includes('@') ? identifier : undefined));

  if (identifier && isValidObjectId(identifier)) {
    const byId = await User.findById(identifier);
    if (byId) {
      return byId;
    }
  }

  if (normalizedEmail) {
    const byEmail = await User.findOne({ email: normalizedEmail });
    if (byEmail) {
      return byEmail;
    }
  }

  return null;
};

const ensureBusinessOwnership = async (businessId, ownerId) => {
  if (!businessId) {
    return null;
  }

  const resolvedId = isValidObjectId(businessId) ? businessId : undefined;
  const business = await Business.findById(resolvedId || businessId);

  if (!business) {
    throw new AppError('Business not found', 404);
  }

  if (ownerId && business.owner?.toString() !== ownerId.toString()) {
    throw new AppError('You do not have permission to manage this business', 403);
  }

  return business;
};

const serializeAccessRecord = (record) => {
  if (!record) {
    return null;
  }

  const plain = record.toObject({ virtuals: true });
  plain.id = plain._id?.toString();
  plain._id = plain.id;
  delete plain.__v;
  plain.permissions = TeamAccess.resolvePermissionSet(plain.accessLevel, plain.permissions || {});
  plain.effectivePermissions = plain.permissions;
  plain.employee = plain.employeeId || null;
  delete plain.employeeId;
  if (plain.employee?._id) {
    plain.employee._id = plain.employee._id.toString();
  }
  if (plain.managedUser?._id) {
    plain.managedUser._id = plain.managedUser._id.toString();
  }
  if (plain.originalUser && plain.originalUser._id) {
    plain.originalUser = plain.originalUser._id.toString();
  } else if (plain.originalUser && typeof plain.originalUser !== 'string') {
    plain.originalUser = plain.originalUser.toString();
  }
  if (plain.grantedBy && plain.grantedBy._id) {
    plain.grantedBy = plain.grantedBy._id.toString();
  }
  if (plain.createdBy && plain.createdBy._id) {
    plain.createdBy = plain.createdBy._id.toString();
  }
  if (plain.managedUserId && typeof plain.managedUserId !== 'string') {
    plain.managedUserId = plain.managedUserId.toString();
  }
  if (plain.businessContext?.businessId && typeof plain.businessContext.businessId !== 'string') {
    plain.businessContext.businessId = plain.businessContext.businessId.toString();
  }
  if (plain.managedUserId && !plain.targetUserId) {
    plain.targetUserId = plain.managedUserId;
  }
  return plain;
};

const buildAccessOwnershipFilter = (ownerId) => ({
  $or: [
    { originalUser: ownerId },
    { managedUser: ownerId },
    { managedUserId: ownerId?.toString() }
  ]
});

exports.grantAccess = catchAsync(async (req, res, next) => {
  const {
    userEmail,
    employeeId,
    managedUserId,
    managedUserEmail,
    targetUserId,
    accessLevel = 'view_only',
    role,
    permissions = {},
    accessScope,
    businessContext,
    restrictions,
    expiresAt,
    status,
    reason,
    notes
  } = req.body || {};

  if (!userEmail && !employeeId) {
    return next(new AppError('userEmail or employeeId is required', 400));
  }

  const normalizedEmail = normalizeEmail(userEmail);
  
  // Resolve employee user using either employeeId or userEmail
  let employeeUser = await resolveUser({ 
    identifier: employeeId || normalizedEmail, 
    email: normalizedEmail 
  });

  // If user doesn't exist yet, we can still create access record with email
  // The user will get access when they register with this email
  if (!employeeUser && !normalizedEmail) {
    return next(new AppError('Employee user not found and no email provided. Provide either existing employeeId or userEmail.', 404));
  }

  let managedIdentifier = managedUserId || targetUserId || managedUserEmail;
  let managedUser = await resolveUser({ identifier: managedIdentifier, email: managedUserEmail });

  if (!managedIdentifier && managedUser) {
    managedIdentifier = managedUser._id.toString();
  }

  if (!managedIdentifier) {
    managedUser = req.user;
    managedIdentifier = req.user._id.toString();
  }

  const businessDetails = await ensureBusinessOwnership(businessContext?.businessId, req.user._id);

  const resolvedBusinessContext = businessDetails
    ? {
        ...businessContext,
        businessId: businessDetails._id
      }
    : businessContext;

  let resolvedScope = accessScope;
  if (!resolvedScope) {
    if (resolvedBusinessContext?.businessId) {
      resolvedScope = 'business_specific';
    } else if (managedUser && managedUser._id?.toString() === req.user._id.toString()) {
      resolvedScope = 'all_owner_businesses';
    } else {
      resolvedScope = 'user_specific';
    }
  }

  const permissionSet = TeamAccess.resolvePermissionSet(accessLevel, permissions);

  const matchQuery = {
    userEmail: normalizedEmail,
    targetUserId: managedIdentifier,
    accessScope: resolvedScope
  };

  // If user exists, also match by employeeId
  if (employeeUser) {
    matchQuery.employeeId = employeeUser._id;
  }

  if (resolvedBusinessContext?.businessId) {
    matchQuery['businessContext.businessId'] = resolvedBusinessContext.businessId;
  }

  let accessRecord = await TeamAccess.findOne(matchQuery);
  const isNewRecord = !accessRecord;

  // Map accessLevel to appropriate role or use custom
  const validRoles = ['owner', 'admin', 'manager', 'supervisor', 'staff', 'viewer', 'custom'];
  let resolvedRole = role;
  
  if (!resolvedRole) {
    // Map common access levels to roles
    const roleMapping = {
      'full_access': 'admin',
      'manage_operations': 'manager',
      'view_only': 'viewer'
    };
    resolvedRole = roleMapping[accessLevel] || 'custom';
  }
  
  // Ensure the role is valid
  if (!validRoles.includes(resolvedRole)) {
    resolvedRole = 'custom';
  }

  const payload = {
    userEmail: normalizedEmail,
    managedUserId: managedIdentifier,
    originalUser: managedUser?._id || req.user._id,
    targetUserId: managedIdentifier,
    accessLevel,
    accessScope: resolvedScope,
    role: resolvedRole,
    permissions: permissionSet
  };

  // Set employeeId only if user exists
  if (employeeUser) {
    payload.employeeId = employeeUser._id;
  }

  if (managedUser?._id) {
    payload.managedUser = managedUser._id;
  }

  if (resolvedBusinessContext !== undefined) {
    payload.businessContext = resolvedBusinessContext;
  }

  if (restrictions !== undefined) {
    payload.restrictions = restrictions;
  }

  if (expiresAt !== undefined) {
    payload.expiresAt = expiresAt ? new Date(expiresAt) : null;
  }

  if (reason !== undefined) {
    payload.reason = reason;
  }

  if (notes !== undefined) {
    payload.notes = notes;
  }

  if (status !== undefined) {
    payload.status = status;
  } else if (!accessRecord) {
    payload.status = 'active';
  }

  if (accessRecord) {
    Object.assign(accessRecord, payload);
  } else {
    payload.grantedBy = req.user._id;
    payload.createdBy = req.user._id;
    accessRecord = new TeamAccess(payload);
  }

  await accessRecord.save();
  await accessRecord.populate([
    { path: 'employeeId', select: 'firstName lastName email userType' },
    { path: 'managedUser', select: 'firstName lastName email userType' }
  ]);

  const responseData = serializeAccessRecord(accessRecord);

  res.status(isNewRecord ? 201 : 200).json({
    status: 'success',
    message: isNewRecord ? 'Team access granted' : 'Team access updated',
    data: responseData
  });
});

exports.listMyTeam = catchAsync(async (req, res) => {
  const records = await TeamAccess.find(buildAccessOwnershipFilter(req.user._id))
    .populate('employeeId', 'firstName lastName email userType')
    .populate('managedUser', 'firstName lastName email userType')
    .sort({ createdAt: -1 });

  const team = records.map(serializeAccessRecord);

  res.status(200).json({
    status: 'success',
    count: team.length,
    data: team
  });
});

exports.listMyAccess = catchAsync(async (req, res) => {
  const records = await TeamAccess.find({
    employeeId: req.user._id,
    status: { $in: ['active', 'pending'] }
  })
    .populate('managedUser', 'firstName lastName email userType')
    .sort({ updatedAt: -1 });

  const managedAccess = records.map(serializeAccessRecord);

  res.status(200).json({
    status: 'success',
    count: managedAccess.length,
    data: managedAccess
  });
});

exports.checkAccessByEmail = catchAsync(async (req, res, next) => {
  const email = normalizeEmail(req.params.email);
  const { permission } = req.query;

  if (!email) {
    return next(new AppError('Email parameter is required', 400));
  }

  // Find access records by userEmail
  const accessRecords = await TeamAccess.find({
    employeeId: req.user._id,
    userEmail: email,
    status: { $in: ['active', 'pending'] }
  }).sort({ updatedAt: -1 });

  if (!accessRecords.length) {
    return res.status(404).json({
      status: 'fail',
      message: 'No team access records found for this user'
    });
  }

  let result = {
    hasAccess: false,
    reason: 'Access not granted for this user'
  };

  // Check each access record
  for (const accessRecord of accessRecords) {
    if (!accessRecord.isAccessValid) {
      result.reason = accessRecord.getInvalidReason();
      continue;
    }

    const effectivePermissions = accessRecord.getEffectivePermissions();

    if (permission && !effectivePermissions[permission]) {
      result.reason = `Missing required permission: ${permission}`;
      continue;
    }

    // Found valid access
    await accessRecord.populate([
      { path: 'employeeId', select: 'firstName lastName email userType' },
      { path: 'managedUser', select: 'firstName lastName email userType' }
    ]);

    result = {
      hasAccess: true,
      reason: null,
      role: accessRecord.role || accessRecord.accessLevel,
      permissions: effectivePermissions,
      accessLevel: accessRecord.accessLevel,
      access: serializeAccessRecord(accessRecord)
    };
    break;
  }

  res.status(200).json({
    status: 'success',
    data: result
  });
});

const buildAccessQueryFromIdentifier = (identifier, ownerId) => {
  const query = {};

  if (identifier && isValidObjectId(identifier)) {
    query._id = identifier;
  } else if (identifier && identifier.includes('@')) {
    query.userEmail = normalizeEmail(identifier);
  } else {
    query.targetUserId = identifier;
  }

  Object.assign(query, buildAccessOwnershipFilter(ownerId));

  return query;
};

exports.updateAccess = catchAsync(async (req, res, next) => {
  const { identifier } = req.params;
  const {
    accessLevel,
    role,
    permissions,
    status,
    businessContext,
    expiresAt,
    restrictions,
    reason,
    notes
  } = req.body || {};

  const query = buildAccessQueryFromIdentifier(identifier, req.user._id);
  const accessRecord = await TeamAccess.findOne(query)
    .populate('employeeId', 'firstName lastName email userType')
    .populate('managedUser', 'firstName lastName email userType');

  if (!accessRecord) {
    return next(new AppError('Access record not found', 404));
  }

  if (accessLevel) {
    accessRecord.accessLevel = accessLevel;
  }

  if (permissions) {
    accessRecord.permissions = TeamAccess.resolvePermissionSet(accessRecord.accessLevel, permissions);
  }

  if (role) {
    accessRecord.role = role;
  }

  if (status) {
    accessRecord.status = status;
  }

  if (reason) {
    accessRecord.reason = reason;
  }

  if (notes !== undefined) {
    accessRecord.notes = notes;
  }

  if (expiresAt !== undefined) {
    accessRecord.expiresAt = expiresAt ? new Date(expiresAt) : null;
  }

  if (restrictions) {
    accessRecord.restrictions = restrictions;
  }

  if (businessContext) {
    const business = await ensureBusinessOwnership(businessContext.businessId, req.user._id);
    accessRecord.businessContext = business
      ? { ...businessContext, businessId: business._id }
      : businessContext;
  }

  await accessRecord.save();

  const responseData = serializeAccessRecord(accessRecord);

  res.status(200).json({
    status: 'success',
    message: 'Access record updated',
    data: responseData
  });
});

exports.revokeAccess = catchAsync(async (req, res, next) => {
  const { identifier } = req.params;
  const query = buildAccessQueryFromIdentifier(identifier, req.user._id);

  const accessRecord = await TeamAccess.findOne(query)
    .populate('employeeId', 'firstName lastName email userType')
    .populate('managedUser', 'firstName lastName email userType');

  if (!accessRecord) {
    return next(new AppError('Access record not found', 404));
  }

  accessRecord.status = 'revoked';
  accessRecord.revokedAt = new Date();

  if (req.body?.reason) {
    accessRecord.reason = req.body.reason;
  }

  await accessRecord.save();

  const responseData = serializeAccessRecord(accessRecord);

  res.status(200).json({
    status: 'success',
    message: 'Access revoked',
    data: responseData
  });
});
