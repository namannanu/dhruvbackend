const mongoose = require('mongoose');

const { Schema } = mongoose;

const ACCESS_LEVELS = ['full_access', 'manage_operations', 'view_only'];
const ACCESS_SCOPES = [
  'user_specific',
  'business_specific',
  'all_owner_businesses',
  'independent_operator'
];
const ACCESS_STATUS = ['invited', 'pending', 'active', 'suspended', 'revoked', 'expired'];

const permissionFields = {
  canCreateBusiness: { type: Boolean, default: false },
  canEditBusiness: { type: Boolean, default: false },
  canDeleteBusiness: { type: Boolean, default: false },
  canViewBusiness: { type: Boolean, default: false },

  canCreateJobs: { type: Boolean, default: false },
  canEditJobs: { type: Boolean, default: false },
  canDeleteJobs: { type: Boolean, default: false },
  canViewJobs: { type: Boolean, default: false },

  canViewApplications: { type: Boolean, default: false },
  canManageApplications: { type: Boolean, default: false },

  canCreateShifts: { type: Boolean, default: false },
  canEditShifts: { type: Boolean, default: false },
  canDeleteShifts: { type: Boolean, default: false },
  canViewShifts: { type: Boolean, default: false },

  canViewWorkers: { type: Boolean, default: false },
  canManageWorkers: { type: Boolean, default: false },
  canHireWorkers: { type: Boolean, default: false },
  canFireWorkers: { type: Boolean, default: false },

  canViewTeam: { type: Boolean, default: false },
  canManageTeam: { type: Boolean, default: false },
  canGrantAccess: { type: Boolean, default: false },

  canCreateAttendance: { type: Boolean, default: false },
  canEditAttendance: { type: Boolean, default: false },
  canViewAttendance: { type: Boolean, default: false },
  canManageAttendance: { type: Boolean, default: false },

  canViewEmployment: { type: Boolean, default: false },
  canManageEmployment: { type: Boolean, default: false },

  canViewPayments: { type: Boolean, default: false },
  canManagePayments: { type: Boolean, default: false },
  canProcessPayments: { type: Boolean, default: false },

  canViewBudgets: { type: Boolean, default: false },
  canManageBudgets: { type: Boolean, default: false },

  canViewAnalytics: { type: Boolean, default: false },
  canViewReports: { type: Boolean, default: false },
  canExportData: { type: Boolean, default: false }
};

const permissionKeys = Object.keys(permissionFields);

const permissionsSchema = new Schema(permissionFields, {
  _id: false,
  minimize: false
});

const businessContextSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business' },
    allBusinesses: { type: Boolean, default: false },
    canCreateNewBusiness: { type: Boolean, default: false },
    canGrantAccessToOthers: { type: Boolean, default: false }
  },
  { _id: false, minimize: false }
);

const restrictionsSchema = new Schema(
  {
    startDate: Date,
    endDate: Date
  },
  { _id: false, minimize: false }
);

const ACCESS_LEVEL_DEFAULTS = {
  full_access: permissionKeys.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {}),
  manage_operations: {
    canViewBusiness: true,
    canEditBusiness: true,
    canCreateJobs: true,
    canEditJobs: true,
    canDeleteJobs: false,
    canViewJobs: true,
    canViewApplications: true,
    canManageApplications: true,
    canCreateAttendance: true,
    canEditAttendance: true,
    canViewAttendance: true,
    canManageAttendance: true,
    canViewWorkers: true,
    canManageWorkers: true,
    canHireWorkers: true,
    canFireWorkers: true,
    canViewTeam: true,
    canManageTeam: true,
    canViewPayments: true,
    canManagePayments: false,
    canProcessPayments: false,
    canViewBudgets: true,
    canManageBudgets: false,
    canViewEmployment: true,
    canManageEmployment: true,
    canViewAnalytics: true,
    canViewReports: true,
    canExportData: false,
    canGrantAccess: false
  },
  view_only: {
    canViewBusiness: true,
    canViewJobs: true,
    canViewApplications: true,
    canViewAttendance: true,
    canViewWorkers: true,
    canViewTeam: true,
    canViewEmployment: true,
    canViewPayments: false,
    canViewBudgets: false,
    canViewAnalytics: true,
    canViewReports: true
  }
};

const normalizeObjectId = (value) => {
  if (!value) return null;
  try {
    return value.toString();
  } catch (error) {
    return null;
  }
};

const applyAccessLevelDefaults = (accessLevel, overrides = {}) => {
  const resolvedLevel = ACCESS_LEVEL_DEFAULTS[accessLevel] || {};
  const merged = {};

  permissionKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      merged[key] = overrides[key];
      return;
    }

    if (Object.prototype.hasOwnProperty.call(resolvedLevel, key)) {
      merged[key] = resolvedLevel[key];
      return;
    }

    merged[key] = false;
  });

  return merged;
};

const teamAccessSchema = new Schema(
  {
    managedUser: { type: Schema.Types.ObjectId, ref: 'User' },
    managedUserId: { type: String, trim: true, index: true },
    originalUser: { type: Schema.Types.ObjectId, ref: 'User' },
    targetUserId: { type: String, trim: true, index: true },

    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true, index: true },

    accessLevel: { type: String, enum: ACCESS_LEVELS, default: 'view_only', index: true },
    accessScope: { type: String, enum: ACCESS_SCOPES, default: 'user_specific' },
    status: { type: String, enum: ACCESS_STATUS, default: 'active', index: true },

    role: {
      type: String,
      enum: ['owner', 'admin', 'manager', 'supervisor', 'staff', 'viewer', 'custom'],
      default: 'custom'
    },

    permissions: { type: permissionsSchema, default: () => ({}) },
    businessContext: { type: businessContextSchema, default: () => ({}) },
    restrictions: { type: restrictionsSchema, default: () => ({}) },

    metadata: { type: Schema.Types.Mixed },

    grantedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },

    reason: { type: String, trim: true },
    notes: { type: String, trim: true },

    expiresAt: { type: Date },
    revokedAt: { type: Date },
    lastUsedAt: { type: Date }
  },
  {
    timestamps: true,
    minimize: false
  }
);

teamAccessSchema.index(
  {
    employeeId: 1,
    status: 1,
    managedUser: 1
  }
);

teamAccessSchema.index(
  {
    employeeId: 1,
    status: 1,
    managedUserId: 1
  }
);

teamAccessSchema.index(
  {
    employeeId: 1,
    status: 1,
    originalUser: 1
  }
);

teamAccessSchema.virtual('isAccessValid').get(function () {
  if (!['active', 'pending'].includes(this.status)) {
    return false;
  }

  const now = new Date();

  if (this.expiresAt && this.expiresAt < now) {
    return false;
  }

  if (this.restrictions?.startDate && this.restrictions.startDate > now) {
    return false;
  }

  if (this.restrictions?.endDate && this.restrictions.endDate < now) {
    return false;
  }

  return true;
});

teamAccessSchema.methods.getInvalidReason = function () {
  if (!['active', 'pending'].includes(this.status)) {
    return `Access is ${this.status}`;
  }

  const now = new Date();

  if (this.expiresAt && this.expiresAt < now) {
    return 'Access has expired';
  }

  if (this.restrictions?.startDate && this.restrictions.startDate > now) {
    return 'Access not yet active';
  }

  if (this.restrictions?.endDate && this.restrictions.endDate < now) {
    return 'Access has ended';
  }

  return 'Access is not valid';
};

teamAccessSchema.methods.matchesTargetUser = function (targetUserId) {
  if (!targetUserId) {
    return false;
  }

  const normalized = targetUserId.toString().toLowerCase();
  const candidates = [
    normalizeObjectId(this.managedUser),
    this.managedUserId,
    normalizeObjectId(this.originalUser),
    this.targetUserId
  ];

  return candidates.some((value) => {
    if (!value) return false;
    return value.toString().toLowerCase() === normalized;
  });
};

teamAccessSchema.methods.getEffectivePermissions = function () {
  return applyAccessLevelDefaults(this.accessLevel, this.permissions || {});
};

teamAccessSchema.methods.hasPermission = function (permissionKey) {
  const effective = this.getEffectivePermissions();
  return Boolean(effective[permissionKey]);
};

const preparePermissionsForUpdate = (doc) => {
  if (!doc) {
    return;
  }

  const accessLevel = doc.accessLevel || 'view_only';
  doc.permissions = applyAccessLevelDefaults(accessLevel, doc.permissions || {});
};

teamAccessSchema.pre('save', function (next) {
  preparePermissionsForUpdate(this);
  next();
});

teamAccessSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() || {};
  const set = update.$set || {};
  const hasAccessLevelUpdate = Object.prototype.hasOwnProperty.call(update, 'accessLevel') ||
    Object.prototype.hasOwnProperty.call(set, 'accessLevel');
  const hasPermissionUpdate = Object.prototype.hasOwnProperty.call(update, 'permissions') ||
    Object.prototype.hasOwnProperty.call(set, 'permissions');

  if (!hasAccessLevelUpdate && !hasPermissionUpdate) {
    return next();
  }

  const currentDoc = await this.model.findOne(this.getQuery());
  if (!currentDoc) {
    return next();
  }

  const nextLevel = (set.accessLevel ?? update.accessLevel) || currentDoc.accessLevel || 'view_only';
  const incomingPermissions = set.permissions ?? update.permissions;
  const combinedPermissions = {
    ...(currentDoc.permissions || {}),
    ...(incomingPermissions || {})
  };
  const mergedPermissions = applyAccessLevelDefaults(nextLevel, combinedPermissions);

  if (update.$set) {
    update.$set.permissions = mergedPermissions;
    update.$set.accessLevel = nextLevel;
  } else {
    update.permissions = mergedPermissions;
    update.accessLevel = nextLevel;
  }

  this.setUpdate(update);
  next();
});

teamAccessSchema.statics.resolvePermissionSet = function (accessLevel, overrides = {}) {
  return applyAccessLevelDefaults(accessLevel, overrides);
};

teamAccessSchema.statics.checkAccess = async function (employeeId, targetUserId, requiredPermission = null) {
  if (!employeeId || !targetUserId) {
    return {
      hasAccess: false,
      reason: 'Employee and target user identifiers are required'
    };
  }

  const accessRecords = await this.find({
    employeeId,
    status: { $in: ['active', 'pending'] }
  }).sort({ updatedAt: -1 });

  if (!accessRecords.length) {
    return {
      hasAccess: false,
      reason: 'No team access records found for this employee'
    };
  }

  let failedReason = 'Access not granted for this user';

  for (const accessRecord of accessRecords) {
    if (!accessRecord.matchesTargetUser(targetUserId)) {
      continue;
    }

    if (!accessRecord.isAccessValid) {
      failedReason = accessRecord.getInvalidReason();
      continue;
    }

    const effectivePermissions = accessRecord.getEffectivePermissions();

    if (requiredPermission && !effectivePermissions[requiredPermission]) {
      failedReason = `Missing required permission: ${requiredPermission}`;
      continue;
    }

    return {
      hasAccess: true,
      reason: null,
      role: accessRecord.role || accessRecord.accessLevel,
      permissions: effectivePermissions,
      accessLevel: accessRecord.accessLevel,
      access: accessRecord
    };
  }

  return {
    hasAccess: false,
    reason: failedReason
  };
};

teamAccessSchema.statics.getManagedUserIds = async function (employeeId) {
  if (!employeeId) {
    return [];
  }

  const accessRecords = await this.find({
    employeeId,
    status: { $in: ['active', 'pending'] }
  });

  return accessRecords
    .filter((record) => record.isAccessValid)
    .map((record) => ({
      userId:
        record.managedUserId ||
        normalizeObjectId(record.managedUser) ||
        normalizeObjectId(record.originalUser) ||
        record.targetUserId,
      accessLevel: record.accessLevel,
      permissions: record.getEffectivePermissions(),
      record
    }))
    .filter((entry) => Boolean(entry.userId));
};

const TeamAccess = mongoose.models.TeamAccess || mongoose.model('TeamAccess', teamAccessSchema);

module.exports = TeamAccess;
