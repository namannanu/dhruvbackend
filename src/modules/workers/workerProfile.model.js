const mongoose = require('mongoose');

// Time slot schema for availability
const timeSlotSchema = new mongoose.Schema({
  startTime: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:MM format'
    }
  },
  endTime: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:MM format'
    }
  }
}, { _id: false });

// Daily availability schema
const dailyAvailabilitySchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  timeSlots: [timeSlotSchema]
}, { _id: false });

const workerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    bio: { type: String, trim: true },
    skills: { type: [String], default: [] },
    experience: { type: String, trim: true },
    languages: { type: [String], default: [] },
    rating: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    weeklyEarnings: { type: Number, default: 0 },
    preferredRadiusMiles: { type: Number, default: 25 },
    notificationsEnabled: { type: Boolean, default: true },
    emailNotificationsEnabled: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    
    // Work preferences
    minimumPay: { type: Number },
    maxTravelDistance: { type: Number },
    availableForFullTime: { type: Boolean, default: false },
    availableForPartTime: { type: Boolean, default: true },
    availableForTemporary: { type: Boolean, default: true },
    weekAvailability: { type: String, default: 'All week' },
    
    // Privacy settings
    isVisible: { type: Boolean, default: true },
    locationEnabled: { type: Boolean, default: true },
    shareWorkHistory: { type: Boolean, default: true },
    
    availability: {
      type: [dailyAvailabilitySchema],
      default: function() {
        return [
          { day: 'monday', isAvailable: false, timeSlots: [] },
          { day: 'tuesday', isAvailable: false, timeSlots: [] },
          { day: 'wednesday', isAvailable: false, timeSlots: [] },
          { day: 'thursday', isAvailable: false, timeSlots: [] },
          { day: 'friday', isAvailable: false, timeSlots: [] },
          { day: 'saturday', isAvailable: false, timeSlots: [] },
          { day: 'sunday', isAvailable: false, timeSlots: [] }
        ];
      }
    },
    // Keep legacy availability for backwards compatibility (will be deprecated)
    legacyAvailability: {
      type: [String],
      default: []
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual to access userId through user reference
workerProfileSchema.virtual('userId', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true,
  get: function() {
    return this.user?.userId;
  }
});

module.exports = mongoose.model('WorkerProfile', workerProfileSchema);
