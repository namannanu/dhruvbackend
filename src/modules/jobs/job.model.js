// job.model.js
const mongoose = require('mongoose');
const Business = require('../businesses/business.model');
const {
  normalizeString,
  deriveBusinessLocation,
  buildLocationAddressString,
} = require('../../shared/utils/location');

const scheduleSchema = new mongoose.Schema(
  {
    startDate: Date,
    endDate: Date,
    startTime: String,
    endTime: String,
    recurrence: String,         // 'one-time' | 'weekly' | 'monthly' | 'custom'
    workDays: { type: [String], default: [] },
  },
  { _id: false }
);

const overtimeSchema = new mongoose.Schema(
  {
    allowed: { type: Boolean, default: false },
    rateMultiplier: { type: Number, default: 1.5 },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    line1: String,
    address: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    latitude: Number,
    longitude: Number,
    allowedRadius: { type: Number, default: 150 },
    name: String,
    notes: String,
    timezone: String,
    isActive: { type: Boolean, default: true },
    placeId: String,
    setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    setAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },

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
      default: 'active',
    },

    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    applicantsCount: { type: Number, default: 0 },
    hiredWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    metrics: {
      views: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

jobSchema.index({ employer: 1, status: 1 });
jobSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

jobSchema.pre('save', async function jobLocationAutofill(next) {
  try {
    if (!this.business) return next();

    const currentLocation =
      this.location && typeof this.location.toObject === 'function'
        ? this.location.toObject()
        : this.location || null;

    const hasBasics = Boolean(
      currentLocation &&
        (normalizeString(currentLocation.address) || normalizeString(currentLocation.line1))
    );
    if (hasBasics) return next();

    const business = await Business.findById(this.business).lean();
    if (!business) return next();

    const derived = deriveBusinessLocation({
      business,
      addressOverride: normalizeString(currentLocation?.address) || normalizeString(currentLocation?.line1),
    });
    if (!derived) return next();

    const merged = { ...derived, ...(currentLocation || {}) };
    const formatted = buildLocationAddressString(merged);
    if (formatted) {
      if (!normalizeString(merged.address)) merged.address = formatted;
      if (!normalizeString(merged.line1)) merged.line1 = formatted;
    }

    this.location = merged;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Job', jobSchema);
