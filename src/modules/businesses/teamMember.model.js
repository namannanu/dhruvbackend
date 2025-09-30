const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['owner', 'admin', 'manager', 'supervisor', 'staff'],
      default: 'staff'
    },
    permissions: {
      type: [
        {
          type: String,
          enum: [
            // Business Management
            'create_business',
            'edit_business',
            'delete_business',
            'view_business_analytics',
            
            // Job Management
            'create_jobs',
            'edit_jobs',
            'delete_jobs',
            'view_jobs',
            'post_jobs',
            
            // Worker & Application Management
            'hire_workers',
            'fire_workers',
            'view_applications',
            'manage_applications',
            'approve_applications',
            'reject_applications',
            
            // Schedule & Attendance Management
            'create_schedules',
            'edit_schedules',
            'delete_schedules',
            'manage_schedules',
            'view_attendance',
            'manage_attendance',
            'approve_attendance',
            
            // Payment & Financial Management
            'view_payments',
            'manage_payments',
            'process_payments',
            'view_financial_reports',
            
            // Team Management
            'invite_team_members',
            'edit_team_members',
            'remove_team_members',
            'manage_permissions',
            
            // Analytics & Reporting
            'view_analytics',
            'view_reports',
            'export_data',
            
            // System Administration
            'manage_settings',
            'view_audit_logs',
            'manage_integrations'
          ]
        }
      ],
      default: []
    },
    assignedLocations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business'
      }
    ],
    active: { type: Boolean, default: true },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    invitedAt: { type: Date, default: Date.now },
    joinedAt: { type: Date },
    lastActive: { type: Date }
  },
  { timestamps: true }
);

teamMemberSchema.index({ business: 1, email: 1 }, { unique: true });
teamMemberSchema.index({ business: 1, user: 1 }, { unique: true });

// Virtual for backwards compatibility
teamMemberSchema.virtual('businessId').get(function() {
  return this.business;
});

// Method to check if user has specific permission
teamMemberSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

// Method to check if user has any of the specified permissions
teamMemberSchema.methods.hasAnyPermission = function(permissions) {
  return permissions.some(permission => this.permissions.includes(permission));
};

// Method to check if user has all of the specified permissions
teamMemberSchema.methods.hasAllPermissions = function(permissions) {
  return permissions.every(permission => this.permissions.includes(permission));
};

module.exports = mongoose.model('TeamMember', teamMemberSchema);
