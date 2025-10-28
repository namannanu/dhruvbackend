const mongoose = require('mongoose');

const reportLocationSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    formattedAddress: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    placeId: { type: String, trim: true },
    allowedRadius: {
      type: Number,
      default: 150,
      min: 10,
      max: 5000
    },
    notes: { type: String, trim: true },
    setBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    setAt: { type: Date },
    timezone: { type: String, trim: true }
  },
  { _id: false }
);

const workerEmploymentSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true
    },
    hireDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    endDate: {
      type: Date,
      default: null
    },
    employmentStatus: {
      type: String,
      enum: ['active', 'terminated', 'resigned', 'completed'],
      default: 'active',
      index: true
    },
    position: {
      type: String,
      required: true
    },
    hourlyRate: {
      type: Number,
      required: true,
      min: 0
    },
    workLocation: String,
    workLocationDetails: reportLocationSchema,
    startDate: {
      type: Date,
      required: true
    },
    scheduledEndDate: {
      type: Date
    },
    terminationReason: {
      type: String,
      default: null
    },
    notes: {
      type: String,
      default: null
    },
    // Performance metrics
    totalHoursWorked: {
      type: Number,
      default: 0,
      min: 0
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0
    },
    attendanceCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for efficient queries
workerEmploymentSchema.index({ worker: 1, employmentStatus: 1 });
workerEmploymentSchema.index({ employer: 1, employmentStatus: 1 });
workerEmploymentSchema.index({ hireDate: 1, endDate: 1 });
workerEmploymentSchema.index({ business: 1, employmentStatus: 1 });
workerEmploymentSchema.index({ 'workLocationDetails.latitude': 1, 'workLocationDetails.longitude': 1 });

// Virtual for employment duration
workerEmploymentSchema.virtual('employmentDuration').get(function () {
  const endDate = this.endDate || new Date();
  const durationMs = endDate - this.hireDate;
  return Math.ceil(durationMs / (1000 * 60 * 60 * 24)); // Duration in days
});

// Virtual for employment status display
workerEmploymentSchema.virtual('statusDisplay').get(function () {
  const statusMap = {
    active: 'Currently Employed',
    terminated: 'Terminated',
    resigned: 'Resigned',
    completed: 'Contract Completed'
  };
  return statusMap[this.employmentStatus] || this.employmentStatus;
});

// Virtual to access worker userId
workerEmploymentSchema.virtual('workerUserId', {
  ref: 'User',
  localField: 'worker',
  foreignField: '_id',
  justOne: true,
  get: function() {
    return this.worker?.userId;
  }
});

// Virtual to access employer userId
workerEmploymentSchema.virtual('employerUserId', {
  ref: 'User',
  localField: 'employer',
  foreignField: '_id',
  justOne: true,
  get: function() {
    return this.employer?.userId;
  }
});

// Instance method to end employment
workerEmploymentSchema.methods.endEmployment = function (reason = 'Employment ended') {
  this.endDate = new Date();
  this.employmentStatus = reason.toLowerCase().includes('resign') ? 'resigned' : 'terminated';
  this.terminationReason = reason;
  return this.save();
};

// Static method to find active employments
workerEmploymentSchema.statics.findActiveEmployments = function (filters = {}) {
  return this.find({
    employmentStatus: 'active',
    ...filters
  })
    .populate('worker', 'firstName lastName email phone')
    .populate('employer', 'firstName lastName email')
    .populate('business', 'name address logoUrl logo')
    .populate('job', 'title description');
};

// Static method to find employment history for a worker
workerEmploymentSchema.statics.getWorkerHistory = function (workerId) {
  return this.find({ worker: workerId })
    .populate('employer', 'firstName lastName email')
    .populate('business', 'name address logoUrl logo')
    .populate('job', 'title description hourlyRate')
    .sort({ hireDate: -1 });
};

// Static method to find workers employed on a specific date
workerEmploymentSchema.statics.findWorkersEmployedOnDate = function (date) {
  const targetDate = new Date(date);
  return this.find({
    hireDate: { $lte: targetDate },
    $or: [
      { endDate: null }, // Still active
      { endDate: { $gte: targetDate } } // Ended after target date
    ]
  })
    .populate('worker', 'firstName lastName email phone')
    .populate('employer', 'firstName lastName email')
    .populate('business', 'name address logoUrl logo')
    .populate('job', 'title description');
};

// Pre-save middleware to update worker profile
workerEmploymentSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Update worker profile when new employment is created
    const WorkerProfile = require('./workerProfile.model');
    await WorkerProfile.updateOne(
      { user: this.worker },
      {
        $set: {
          employmentStatus: 'employed',
          currentEmployer: this.employer,
          hireDate: this.hireDate
        }
      }
    );
  }
  
  if (this.isModified('employmentStatus') && this.employmentStatus !== 'active') {
    // Update worker profile when employment ends
    const WorkerProfile = require('./workerProfile.model');
    await WorkerProfile.updateOne(
      { user: this.worker },
      {
        $set: {
          employmentStatus: 'available',
          currentEmployer: null
        }
      }
    );
  }
  
  next();
});

// Pre-remove middleware to clean up references
workerEmploymentSchema.pre('remove', async function (next) {
  // Update worker profile when employment record is deleted
  const WorkerProfile = require('./workerProfile.model');
  await WorkerProfile.updateOne(
    { user: this.worker },
    {
      $set: {
        employmentStatus: 'available',
        currentEmployer: null,
        hireDate: null
      }
    }
  );
  
  next();
});

// Static method to find employment records by userId (worker or employer)
workerEmploymentSchema.statics.findByUserId = function(userId) {
  return this.find()
    .populate('worker', 'userId firstName lastName email')
    .populate('employer', 'userId firstName lastName email')
    .populate('business', 'name address logoUrl')
    .populate('job', 'title description hourlyRate')
    .then(records => {
      return records.filter(record => 
        record.worker?.userId === userId || 
        record.employer?.userId === userId
      );
    });
};

module.exports = mongoose.model('WorkerEmployment', workerEmploymentSchema);
