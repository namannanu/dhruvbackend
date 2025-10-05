const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

const businessEmployeeSchema = new Schema(
  {
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ['manager', 'recruiter', 'attendance_officer', 'viewer', 'custom'],
      default: 'viewer'
    },
    permissions: {
      canManageJobs: { type: Boolean, default: false },
      canViewApplications: { type: Boolean, default: true },
      canManageApplications: { type: Boolean, default: false },
      canManageAttendance: { type: Boolean, default: false },
      canViewReports: { type: Boolean, default: false },
      canEditBusinessProfile: { type: Boolean, default: false },
      canManagePayments: { type: Boolean, default: false }
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    status: {
      type: String,
      enum: ['invited', 'active', 'suspended'],
      default: 'invited'
    },
    lastLoginAt: { type: Date },
    invitedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date }
  },
  {
    timestamps: true,
    minimize: false
  }
);

businessEmployeeSchema.index({ business: 1, email: 1 }, { unique: true });

businessEmployeeSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};

businessEmployeeSchema.methods.validatePassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

const BusinessEmployee =
  mongoose.models.BusinessEmployee || mongoose.model('BusinessEmployee', businessEmployeeSchema);

module.exports = BusinessEmployee;
