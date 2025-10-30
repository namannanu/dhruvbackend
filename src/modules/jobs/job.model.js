const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    startDate: Date,
    endDate: Date,
    startTime: String,
    endTime: String,
    recurrence: String,
    workDays: {
      type: [String],
      default: []
    }
  },
  { _id: false }
);

const overtimeSchema = new mongoose.Schema(
  {
    allowed: { type: Boolean, default: false },
    rateMultiplier: { type: Number, default: 1.5 }
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true // Jobs must belong to a business
    },
    // Maintain legacy `business` field for compatibility with existing controllers
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business'
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    hourlyRate: { type: Number, required: true },
    overtime: overtimeSchema,
    urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    tags: { type: [String], default: [] },
    schedule: scheduleSchema,
    // Location data is inherited from business.location
    verificationRequired: { type: Boolean, default: false },
    premiumRequired: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['draft', 'active', 'filled', 'closed'],
      default: 'active'
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    applicantsCount: { type: Number, default: 0 },
    hiredWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    metrics: {
      views: { type: Number, default: 0 },
      saves: { type: Number, default: 0 }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/**
 * Keep `business` and `businessId` in sync so legacy codepaths that rely on
 * `job.business` continue to work while `businessId` remains the source of truth.
 */
function syncBusinessFields(doc) {
  if (!doc) {
    return;
  }
  if (doc.business && !doc.businessId) {
    doc.businessId = doc.business;
  } else if (doc.businessId && !doc.business) {
    doc.business = doc.businessId;
  }
}

jobSchema.pre('validate', function(next) {
  syncBusinessFields(this);
  next();
});

jobSchema.pre('save', function(next) {
  syncBusinessFields(this);
  next();
});

function syncBusinessFieldsOnUpdate(update) {
  if (!update) {
    return;
  }

  const direct = update;
  const set = update.$set;

  if (direct) {
    if (direct.business && !direct.businessId) {
      direct.businessId = direct.business;
    } else if (direct.businessId && !direct.business) {
      direct.business = direct.businessId;
    }
  }

  if (set) {
    if (set.business && !set.businessId) {
      set.businessId = set.business;
    } else if (set.businessId && !set.business) {
      set.business = set.businessId;
    }
  }
}

jobSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  syncBusinessFieldsOnUpdate(this.getUpdate());
  next();
});

jobSchema.post('init', function(doc) {
  syncBusinessFields(doc);
});

// Virtual to access employer userId
jobSchema.virtual('employerUserId', {
  ref: 'User',
  localField: 'employer',
  foreignField: '_id',
  justOne: true,
  get: function() {
    return this.employer?.userId;
  }
});

// Virtual to access hired worker userId
jobSchema.virtual('hiredWorkerUserId', {
  ref: 'User',
  localField: 'hiredWorker',
  foreignField: '_id',
  justOne: true,
  get: function() {
    return this.hiredWorker?.userId;
  }
});

// Static method to find jobs by userId (employer or hired worker)
jobSchema.statics.findByUserId = function(userId) {
  return this.find()
    .populate('employer', 'userId firstName lastName email')
    .populate('hiredWorker', 'userId firstName lastName email')
    .then(jobs => {
      return jobs.filter(job => 
        job.employer?.userId === userId || 
        job.hiredWorker?.userId === userId
      );
    });
};

// Instance method to validate worker location against business location
jobSchema.methods.validateWorkerLocation = async function(workerLocation) {
  // Populate business if not already populated
  if (!this.populated('businessId')) {
    await this.populate('businessId');
  }
  
  const business = this.businessId;
  if (!business || !business.location) {
    return {
      isValid: true, // No location restrictions if business location not set
      reason: 'No location validation required - business location not configured',
      distance: null
    };
  }

  const businessLocation = business.location;
  
  if (!businessLocation.latitude || !businessLocation.longitude) {
    return {
      isValid: false,
      reason: 'Business location coordinates not set',
      distance: null
    };
  }

  if (!businessLocation.isActive) {
    return {
      isValid: false,
      reason: 'Business location is currently disabled for attendance',
      distance: null
    };
  }

  if (!workerLocation || !workerLocation.latitude || !workerLocation.longitude) {
    return {
      isValid: false,
      reason: 'Worker location is required',
      distance: null
    };
  }

  const distance = this.calculateDistanceToBusinessLocation(workerLocation);
  const allowedRadius = businessLocation.allowedRadius || 150;

  if (distance <= allowedRadius) {
    return {
      isValid: true,
      reason: 'Worker is within allowed radius',
      distance: Math.round(distance * 100) / 100,
      allowedRadius: allowedRadius
    };
  } else {
    return {
      isValid: false,
      reason: `Worker is ${Math.round(distance)}m away from job location (max allowed: ${allowedRadius}m)`,
      distance: Math.round(distance * 100) / 100,
      allowedRadius: allowedRadius
    };
  }
};

// Instance method to calculate distance using Haversine formula
jobSchema.methods.calculateDistanceToBusinessLocation = function(workerLocation) {
  const business = this.businessId;
  if (!business?.location?.latitude || !business?.location?.longitude || 
      !workerLocation?.latitude || !workerLocation?.longitude) {
    return Infinity;
  }

  const businessLocation = business.location;
  const earthRadius = 6371000; // Earth's radius in meters
  const lat1Rad = businessLocation.latitude * Math.PI / 180;
  const lat2Rad = workerLocation.latitude * Math.PI / 180;
  const deltaLatRad = (workerLocation.latitude - businessLocation.latitude) * Math.PI / 180;
  const deltaLngRad = (workerLocation.longitude - businessLocation.longitude) * Math.PI / 180;

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c; // Distance in meters
};

// Virtual to get business location info
jobSchema.virtual('businessLocationInfo').get(function() {
  const business = this.businessId;
  if (!business?.location) return null;
  
  const businessLocation = business.location;
  return {
    hasGPS: Boolean(businessLocation.latitude && businessLocation.longitude),
    formattedAddress: businessLocation.formattedAddress || businessLocation.line1,
    businessName: business.name,
    allowedRadius: businessLocation.allowedRadius || 150,
    isActive: businessLocation.isActive !== false,
    coordinates: businessLocation.latitude && businessLocation.longitude ? {
      latitude: businessLocation.latitude,
      longitude: businessLocation.longitude
    } : null
  };
});

jobSchema.index({ employer: 1, status: 1 });
jobSchema.index({ businessId: 1, status: 1 });
jobSchema.index({ isPublished: 1, status: 1 });

module.exports = mongoose.model('Job', jobSchema);
