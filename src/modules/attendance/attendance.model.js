const mongoose = require('mongoose');

// Location schema for storing latitude/longitude coordinates
const locationSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  address: String,
  accuracy: Number, // GPS accuracy in meters
  timestamp: Date,
  altitude: Number,
  heading: Number,
  speed: Number
}, { _id: false });

// Job location schema with Google Places API integration
const jobLocationSchema = new mongoose.Schema({
  // GPS Coordinates (from Google Places API)
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  
  // Google Places API data
  formattedAddress: String, // Full address from Google
  name: String, // Place name from Google
  placeId: String, // Google Place ID for validation
  
  // Basic address components
  address: String,
  city: String,
  state: String,
  postalCode: String,
  
  // GPS metadata
  accuracy: Number, // GPS accuracy in meters
  timestamp: Date,
  altitude: Number,
  heading: Number,
  speed: Number,
  
  // Geofencing configuration
  allowedRadius: { 
    type: Number, 
    default: 150, // Default 150 meters (as per documentation)
    min: 10,      // Minimum 10 meters
    max: 5000     // Maximum 5km
  },
  
  // Location management
  notes: String, // Instructions for workers
  isActive: { type: Boolean, default: true }, // Can workers clock in here?
  timezone: String, // Location timezone
  
  // Audit trail
  setBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  setAt: { type: Date, default: Date.now }
}, { _id: false });

const attendanceSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business'
    },
    scheduledStart: { type: Date, required: true },
    scheduledEnd: { type: Date, required: true },
    clockInAt: Date,
    clockOutAt: Date,
    status: {
      type: String,
      enum: ['scheduled', 'clocked-in', 'completed', 'missed'],
      default: 'scheduled'
    },
    totalHours: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
    hourlyRate: Number,
    isLate: { type: Boolean, default: false },
    notes: String,
    workerNameSnapshot: String,
    jobTitleSnapshot: String,
    locationSnapshot: String,
    
    // Location tracking fields
    jobLocation: jobLocationSchema, // The designated job location with geofencing
    clockInLocation: locationSchema, // Where the worker clocked in
    clockOutLocation: locationSchema, // Where the worker clocked out
    locationValidated: { type: Boolean }, // Whether location validation passed
    locationValidationMessage: String, // Validation result message
    clockInDistance: Number, // Distance from job location when clocking in (meters)
    clockOutDistance: Number // Distance from job location when clocking out (meters)
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual to access worker userId
attendanceSchema.virtual('workerUserId', {
  ref: 'User',
  localField: 'worker',
  foreignField: '_id',
  justOne: true,
  get: function() {
    return this.worker?.userId;
  }
});

// Virtual to access employer userId
attendanceSchema.virtual('employerUserId', {
  ref: 'User',
  localField: 'employer',
  foreignField: '_id',
  justOne: true,
  get: function() {
    return this.employer?.userId;
  }
});

// Static method to find attendance by userId (worker or employer)
attendanceSchema.statics.findByUserId = function(userId) {
  return this.find()
    .populate('worker', 'userId firstName lastName email')
    .populate('employer', 'userId firstName lastName email')
    .populate('job', 'title description hourlyRate')
    .populate('business', 'name address')
    .then(records => {
      return records.filter(record => 
        record.worker?.userId === userId || 
        record.employer?.userId === userId
      );
    });
};

attendanceSchema.index({ worker: 1, scheduledStart: -1 });
attendanceSchema.index({ business: 1, scheduledStart: -1 });
attendanceSchema.index({ 'jobLocation.latitude': 1, 'jobLocation.longitude': 1 });

// Helper method to calculate distance between two coordinates using Haversine formula
attendanceSchema.statics.calculateDistance = function(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
};

// Instance method to validate if a location is within the allowed radius
attendanceSchema.methods.isLocationValid = function(workerLat, workerLon) {
  if (!this.jobLocation || !this.jobLocation.isActive) {
    return { isValid: true, distance: null, message: 'No location validation required' };
  }

  const distance = this.constructor.calculateDistance(
    this.jobLocation.latitude,
    this.jobLocation.longitude,
    workerLat,
    workerLon
  );

  const isValid = distance <= this.jobLocation.allowedRadius;
  
  return {
    isValid,
    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
    allowedRadius: this.jobLocation.allowedRadius,
    message: isValid 
      ? 'Location is valid for attendance'
      : `Worker is ${Math.round(distance)}m away from job location (max allowed: ${this.jobLocation.allowedRadius}m)`
  };
};

// Instance method to validate clock-in location
attendanceSchema.methods.validateClockInLocation = function(workerLocation) {
  if (!workerLocation || !workerLocation.latitude || !workerLocation.longitude) {
    return {
      isValid: false,
      reason: 'Worker GPS location is required for clock-in',
      distance: null
    };
  }

  const validation = this.isLocationValid(workerLocation.latitude, workerLocation.longitude);
  
  if (validation.isValid) {
    // Store the clock-in location and validation result
    this.clockInLocation = {
      ...workerLocation,
      timestamp: new Date()
    };
    this.locationValidated = true;
    this.clockInDistance = validation.distance;
    this.locationValidationMessage = validation.message;
  }

  return {
    isValid: validation.isValid,
    reason: validation.message,
    distance: validation.distance,
    allowedRadius: validation.allowedRadius
  };
};

// Instance method to validate clock-out location
attendanceSchema.methods.validateClockOutLocation = function(workerLocation) {
  if (!workerLocation || !workerLocation.latitude || !workerLocation.longitude) {
    return {
      isValid: false,
      reason: 'Worker GPS location is required for clock-out',
      distance: null
    };
  }

  const validation = this.isLocationValid(workerLocation.latitude, workerLocation.longitude);
  
  if (validation.isValid) {
    // Store the clock-out location
    this.clockOutLocation = {
      ...workerLocation,
      timestamp: new Date()
    };
    this.clockOutDistance = validation.distance;
  }

  return {
    isValid: validation.isValid,
    reason: validation.message,
    distance: validation.distance,
    allowedRadius: validation.allowedRadius
  };
};

// Virtual to check if clock-in location was valid
attendanceSchema.virtual('isClockInLocationValid').get(function() {
  return this.locationValidated === true && this.clockInLocation != null;
});

// Virtual to check if clock-out location was valid
attendanceSchema.virtual('isClockOutLocationValid').get(function() {
  return this.clockOutLocation != null && this.clockOutDistance != null;
});

// Virtual to get location validation summary
attendanceSchema.virtual('locationValidationSummary').get(function() {
  return {
    hasJobLocation: Boolean(this.jobLocation?.latitude && this.jobLocation?.longitude),
    clockInValid: this.isClockInLocationValid,
    clockOutValid: this.isClockOutLocationValid,
    clockInDistance: this.clockInDistance,
    clockOutDistance: this.clockOutDistance,
    allowedRadius: this.jobLocation?.allowedRadius,
    validationMessage: this.locationValidationMessage
  };
});

module.exports = mongoose.model('AttendanceRecord', attendanceSchema);
