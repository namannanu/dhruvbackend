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

// Job location schema with geofencing radius
const jobLocationSchema = new mongoose.Schema({
  line1: String,
  address: String,
  city: String,
  state: String,
  postalCode: String,
  country: String,
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: Number,
  timestamp: Date,
  altitude: Number,
  heading: Number,
  speed: Number,
  allowedRadius: { type: Number, default: 100 }, // Radius in meters for attendance validation
  name: String, // Location name (e.g., "Main Office", "Warehouse A")
  description: String,
  isActive: { type: Boolean, default: true }
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
  { timestamps: true }
);

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
    distance,
    allowedRadius: this.jobLocation.allowedRadius,
    message: isValid 
      ? 'Location is valid for attendance'
      : `Worker is ${distance.toFixed(1)}m away from job location (max allowed: ${this.jobLocation.allowedRadius}m)`
  };
};

module.exports = mongoose.model('AttendanceRecord', attendanceSchema);
