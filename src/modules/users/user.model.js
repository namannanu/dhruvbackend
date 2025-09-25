const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },
    userType: {
      type: String,
      enum: ['worker', 'employer'],
      required: true
    },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, trim: true },
    premium: { type: Boolean, default: false },
    // Employer-specific fields
    freeJobsPosted: { 
      type: Number, 
      default: function() {
        return this.userType === 'employer' ? 0 : undefined;
      }
    },
    selectedBusiness: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business'
    },
    // Worker-specific fields  
    freeApplicationsUsed: { 
      type: Number, 
      default: function() {
        return this.userType === 'worker' ? 0 : undefined;
      }
    },
    lastLoginAt: Date,
    passwordChangedAt: Date
  },
  { timestamps: true }
);

userSchema.virtual('fullName').get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
});

userSchema.pre('save', async function (next) {
  // Clean up userType-specific fields
  if (this.userType === 'worker') {
    // Workers don't need employer-specific fields
    this.freeJobsPosted = undefined;
    this.selectedBusiness = undefined;
    // Ensure worker-specific fields have defaults
    if (this.freeApplicationsUsed === undefined) {
      this.freeApplicationsUsed = 0;
    }
  } else if (this.userType === 'employer') {
    // Employers don't need worker-specific fields
    this.freeApplicationsUsed = undefined;
    // Ensure employer-specific fields have defaults
    if (this.freeJobsPosted === undefined) {
      this.freeJobsPosted = 0;
    }
  }

  // Handle password hashing
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

module.exports = mongoose.model('User', userSchema);
