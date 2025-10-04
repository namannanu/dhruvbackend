const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema(
  {
    // The user being granted access
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // The userId they can manage (the original creator's userId)
    managedUserId: {
      type: String,
      required: true,
      index: true
    },
    
    // The original user who owns the data
    originalUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Who granted this access
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Access level and permissions
    role: {
      type: String,
      enum: ['admin', 'manager', 'staff', 'viewer'],
      required: true
    },
    
    // Specific permissions
    permissions: {
      // Job management
      canCreateJobs: { type: Boolean, default: false },
      canEditJobs: { type: Boolean, default: false },
      canDeleteJobs: { type: Boolean, default: false },
      canViewJobs: { type: Boolean, default: true },
      canHireWorkers: { type: Boolean, default: false },
      
      // Attendance management
      canCreateAttendance: { type: Boolean, default: false },
      canEditAttendance: { type: Boolean, default: false },
      canApproveAttendance: { type: Boolean, default: false },
      canViewAttendance: { type: Boolean, default: true },
      
      // Application management
      canViewApplications: { type: Boolean, default: true },
      canManageApplications: { type: Boolean, default: false },
      
      // Employment management
      canViewEmployment: { type: Boolean, default: true },
      canManageEmployment: { type: Boolean, default: false },
      
      // Team management
      canManageTeam: { type: Boolean, default: false },
      canGrantAccess: { type: Boolean, default: false }
    },
    
    // Access restrictions
    restrictions: {
      // Date range access (optional)
      startDate: Date,
      endDate: Date,
      
      // Specific business access (optional - array of business IDs)
      businessIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business'
      }],
      
      // IP restrictions (optional)
      allowedIPs: [String],
      
      // Time-based access (optional)
      allowedHours: {
        start: String, // "09:00"
        end: String    // "17:00"
      }
    },
    
    // Status and metadata
    status: {
      type: String,
      enum: ['active', 'suspended', 'revoked'],
      default: 'active'
    },
    
    // Access notes and reason
    notes: String,
    reason: String, // Why access was granted
    
    // Expiration (optional)
    expiresAt: Date,
    
    // Last access tracking
    lastAccessedAt: Date,
    accessCount: { type: Number, default: 0 }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for efficient queries
teamMemberSchema.index({ user: 1, status: 1 });
teamMemberSchema.index({ managedUserId: 1, status: 1 });
teamMemberSchema.index({ originalUser: 1, status: 1 });
teamMemberSchema.index({ grantedBy: 1 });
teamMemberSchema.index({ expiresAt: 1 });

// Compound index for permission checks
teamMemberSchema.index({ user: 1, managedUserId: 1, status: 1 });

// Virtual to check if access is currently valid
teamMemberSchema.virtual('isAccessValid').get(function() {
  if (this.status !== 'active') return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
});

// Virtual to get permission summary
teamMemberSchema.virtual('permissionSummary').get(function() {
  const perms = this.permissions;
  return {
    level: this.role,
    jobAccess: {
      read: perms.canViewJobs,
      create: perms.canCreateJobs,
      edit: perms.canEditJobs,
      delete: perms.canDeleteJobs,
      hire: perms.canHireWorkers
    },
    attendanceAccess: {
      read: perms.canViewAttendance,
      create: perms.canCreateAttendance,
      edit: perms.canEditAttendance,
      approve: perms.canApproveAttendance
    },
    teamAccess: {
      manage: perms.canManageTeam,
      grant: perms.canGrantAccess
    }
  };
});

// Static method to check if user has permission to access data for a userId
teamMemberSchema.statics.checkAccess = async function(userId, managedUserId, requiredPermission) {
  console.log('🔎 TeamAccess.checkAccess called with:', {
    userId: userId,
    managedUserId: managedUserId,
    requiredPermission: requiredPermission
  });
  
  const access = await this.findOne({
    user: userId,
    managedUserId: managedUserId,
    status: 'active'
  }).populate('user', 'firstName lastName email');
  
  console.log('🔍 Found access record:', access ? {
    id: access._id,
    user: access.user,
    managedUserId: access.managedUserId,
    role: access.role,
    permissions: access.permissions
  } : 'No access record found');
  
  if (!access) {
    return {
      hasAccess: false,
      reason: 'No team access granted for this user'
    };
  }
  
  if (!access.isAccessValid) {
    return {
      hasAccess: false,
      reason: 'Access expired or suspended'
    };
  }
  
  // Check specific permission
  if (requiredPermission && !access.permissions[requiredPermission]) {
    return {
      hasAccess: false,
      reason: `Permission denied: ${requiredPermission}`
    };
  }
  
  // Update last access
  access.lastAccessedAt = new Date();
  access.accessCount += 1;
  await access.save();
  
  return {
    hasAccess: true,
    access,
    role: access.role,
    permissions: access.permissions
  };
};

// Static method to get all managed userIds for a user
teamMemberSchema.statics.getManagedUserIds = async function(userId) {
  const accesses = await this.find({
    user: userId,
    status: 'active'
  }).select('managedUserId role permissions');
  
  return accesses.filter(access => access.isAccessValid).map(access => ({
    userId: access.managedUserId,
    role: access.role,
    permissions: access.permissions
  }));
};

// Method to grant specific permission
teamMemberSchema.methods.grantPermission = function(permission) {
  if (this.permissions.hasOwnProperty(permission)) {
    this.permissions[permission] = true;
    return this.save();
  }
  throw new Error(`Invalid permission: ${permission}`);
};

// Method to revoke specific permission
teamMemberSchema.methods.revokePermission = function(permission) {
  if (this.permissions.hasOwnProperty(permission)) {
    this.permissions[permission] = false;
    return this.save();
  }
  throw new Error(`Invalid permission: ${permission}`);
};

// Method to suspend access
teamMemberSchema.methods.suspend = function(reason) {
  this.status = 'suspended';
  this.notes = reason || 'Access suspended';
  return this.save();
};

// Method to reactivate access
teamMemberSchema.methods.reactivate = function() {
  this.status = 'active';
  return this.save();
};

// Pre-save middleware to handle role-based permissions
teamMemberSchema.pre('save', function(next) {
  // Set default permissions based on role
  if (this.isModified('role')) {
    switch (this.role) {
      case 'admin':
        Object.keys(this.permissions).forEach(perm => {
          this.permissions[perm] = true;
        });
        break;
        
      case 'manager':
        this.permissions.canCreateJobs = true;
        this.permissions.canEditJobs = true;
        this.permissions.canViewJobs = true;
        this.permissions.canHireWorkers = true;
        this.permissions.canCreateAttendance = true;
        this.permissions.canEditAttendance = true;
        this.permissions.canApproveAttendance = true;
        this.permissions.canViewAttendance = true;
        this.permissions.canViewApplications = true;
        this.permissions.canManageApplications = true;
        break;
        
      case 'staff':
        this.permissions.canViewJobs = true;
        this.permissions.canViewAttendance = true;
        this.permissions.canCreateAttendance = true;
        this.permissions.canViewApplications = true;
        break;
        
      case 'viewer':
        this.permissions.canViewJobs = true;
        this.permissions.canViewAttendance = true;
        this.permissions.canViewApplications = true;
        break;
    }
  }
  next();
});

module.exports = mongoose.model('TeamAccess', teamMemberSchema);