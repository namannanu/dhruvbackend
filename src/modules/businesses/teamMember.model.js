const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['manager', 'supervisor', 'admin'],
      default: 'manager'
    },
    permissions: {
      type: [
        {
          type: String,
          enum: [
            'post_jobs',
            'hire_workers',
            'manage_schedules',
            'view_applications',
            'manage_payments',
            'view_analytics'
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
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

teamMemberSchema.index({ business: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('TeamMember', teamMemberSchema);
