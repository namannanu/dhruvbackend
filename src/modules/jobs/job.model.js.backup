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

const locationSchema = new mongoose.Schema(
  {
    // Basic address components
    address: String,
    city: String,
    state: String,
    postalCode: String,
    
    // Google Places API integration
    formattedAddress: { type: String, trim: true }, // From Google Places API
    name: { type: String, trim: true }, // Place name from Google
    placeId: { type: String, trim: true }, // Google Place ID for validation
    
    // GPS Coordinates (required for attendance validation)
    latitude: {
      type: Number,
      required: function() {
        return this.longitude != null; // Require both lat/lng or neither
      },
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: function() {
        return this.latitude != null; // Require both lat/lng or neither
      },
      min: -180,
      max: 180
    },
    
    // Geofencing and attendance validation
    allowedRadius: {
      type: Number,
      default: 150, // Default 150 meters radius
      min: 10,      // Minimum 10 meters for high precision
      max: 5000     // Maximum 5km for large facilities
    },
    
    // Location management
    notes: { type: String, trim: true }, // Special instructions for workers
    isActive: { type: Boolean, default: true }, // Enable/disable attendance here
    timezone: { type: String, trim: true }, // Location timezone
    
    // Audit trail
    setBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // Who set this location
    },
    setAt: { type: Date, default: Date.now }
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
    location: locationSchema,
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

// Instance method to validate worker location against job location
jobSchema.methods.validateWorkerLocation = function(workerLocation) {
  if (!this.location || !this.location.latitude || !this.location.longitude) {
    return {
      isValid: true, // No location restrictions if job location not set
      reason: 'No location validation required',
      distance: null
    };
  }

  if (!this.location.isActive) {
    return {
      isValid: false,
      reason: 'Location is currently disabled for attendance',
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

  const distance = this.calculateDistanceToLocation(workerLocation);
  const allowedRadius = this.location.allowedRadius || 150;

  if (distance <= allowedRadius) {
    return {
      isValid: true,
      reason: 'Worker is within allowed radius',
      distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
      allowedRadius
    };
  } else {
    return {
      isValid: false,
      reason: `Worker is ${Math.round(distance)}m away from job location (max allowed: ${allowedRadius}m)`,
      distance: Math.round(distance * 100) / 100,
      allowedRadius
    };
  }
};

// Instance method to calculate distance using Haversine formula
jobSchema.methods.calculateDistanceToLocation = function(workerLocation) {
  if (!this.location?.latitude || !this.location?.longitude || 
      !workerLocation?.latitude || !workerLocation?.longitude) {
    return Infinity;
  }

  const earthRadius = 6371000; // Earth's radius in meters
  const lat1Rad = this.location.latitude * Math.PI / 180;
  const lat2Rad = workerLocation.latitude * Math.PI / 180;
  const deltaLatRad = (workerLocation.latitude - this.location.latitude) * Math.PI / 180;
  const deltaLngRad = (workerLocation.longitude - this.location.longitude) * Math.PI / 180;

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c; // Distance in meters
};

// Virtual to get formatted location info
jobSchema.virtual('locationInfo').get(function() {
  if (!this.location) return null;
  
  return {
    hasGPS: Boolean(this.location.latitude && this.location.longitude),
    formattedAddress: this.location.formattedAddress || this.location.address,
    name: this.location.name,
    allowedRadius: this.location.allowedRadius || 150,
    isActive: this.location.isActive !== false,
    coordinates: this.location.latitude && this.location.longitude ? {
      latitude: this.location.latitude,
      longitude: this.location.longitude
    } : null
  };
});

jobSchema.index({ employer: 1, status: 1 });
jobSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
jobSchema.index({ isPublished: 1, status: 1 });

module.exports = mongoose.model('Job', jobSchema);
