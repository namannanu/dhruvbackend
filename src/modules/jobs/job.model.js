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
    line1: String,
    line2: String,
    address: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    latitude: Number,
    longitude: Number,
    allowedRadius: Number,
    placeId: String,
    setBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    setAt: Date
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
  { timestamps: true }
);

jobSchema.index({ employer: 1, status: 1 });
jobSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

module.exports = mongoose.model('Job', jobSchema);
