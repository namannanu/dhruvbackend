const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema(
  {
    // The user being granted access (identified by email)
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },
    
    // Reference to the user document (populated from email)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // The employee ID they can manage (taken from JWT token)
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
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
    accessLevel: {
      type: String,
      enum: ['full_access', 'manage_operations', 'limited_access', 'view_only'],
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
teamMemberSchema.index({ userEmail: 1, status: 1 });
teamMemberSchema.index({ employeeId: 1, status: 1 });
teamMemberSchema.index({ originalUser: 1, status: 1 });
teamMemberSchema.index({ grantedBy: 1 });
teamMemberSchema.index({ expiresAt: 1 });

// Compound index for permission checks
teamMemberSchema.index({ userEmail: 1, employeeId: 1, status: 1 });

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
    level: this.accessLevel,
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

// Static method to check if user has permission to access data for an employeeId
teamMemberSchema.statics.checkAccess = async function(userEmail, employeeId, requiredPermission) {
  const access = await this.findOne({
    userEmail: userEmail.toLowerCase(),
    employeeId: employeeId,
    status: 'active'
  }).populate('user', 'firstName lastName email');
  
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
    accessLevel: access.accessLevel,
    permissions: access.permissions
  };
};

// Static method to get all managed employeeIds for a user
teamMemberSchema.statics.getManagedEmployeeIds = async function(userEmail) {
  const accesses = await this.find({
    userEmail: userEmail.toLowerCase(),
    status: 'active'
  }).select('employeeId accessLevel permissions');
  
  return accesses.filter(access => access.isAccessValid).map(access => ({
    employeeId: access.employeeId,
    accessLevel: access.accessLevel,
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

// Pre-save middleware to populate user reference from email
teamMemberSchema.pre('save', async function(next) {
  if (this.isModified('userEmail') && this.userEmail) {
    const User = mongoose.model('User');
    const user = await User.findOne({ email: this.userEmail.toLowerCase() });
    if (user) {
      this.user = user._id;
    }
  }
  next();
});

// Pre-save middleware to handle access level permissions
teamMemberSchema.pre('save', function(next) {
  // Set default permissions based on access level
  if (this.isModified('accessLevel')) {
    switch (this.accessLevel) {
      case 'full_access':
        Object.keys(this.permissions).forEach(perm => {
          this.permissions[perm] = true;
        });
        break;
        
      case 'manage_operations':
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
        
      case 'limited_access':
        this.permissions.canViewJobs = true;
        this.permissions.canViewAttendance = true;
        this.permissions.canCreateAttendance = true;
        this.permissions.canViewApplications = true;
        break;
        
      case 'view_only':
        this.permissions.canViewJobs = true;
        this.permissions.canViewAttendance = true;
        this.permissions.canViewApplications = true;
        break;
    }
  }
  next();
});

// Static method to check access using JWT token context
teamMemberSchema.statics.checkAccessFromToken = async function(req, requiredPermission) {
  if (!req.user || !req.user.email) {
    return {
      hasAccess: false,
      reason: 'No authenticated user found'
    };
  }
  
  // Get employee ID from JWT token (the authenticated user's ID)
  const employeeId = req.user._id;
  const userEmail = req.user.email;
  
  return this.checkAccess(userEmail, employeeId, requiredPermission);
};

module.exports = mongoose.model('TeamAccess', teamMemberSchema);