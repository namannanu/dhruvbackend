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
    line1: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    formattedAddress: { type: String, required: true },
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
    location: { type: locationSchema, required: true },

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
    if (!this.business) {
      throw new Error('Business ID is required');
    }

    // If no location is provided, try to get it from the business
    if (!this.location) {
      const business = await Business.findById(this.business).lean();
      if (!business || !business.location) {
        throw new Error('Job location is required. Either provide location in the job or set a location for the business.');
      }

      const derived = deriveBusinessLocation({
        business,
        addressOverride: null,
      });

      if (!derived) {
        throw new Error('Unable to derive location from business. Please provide location details.');
      }

      this.location = derived;
    }

    // Ensure all required fields are present
    const requiredFields = ['line1', 'address', 'city', 'state', 'postalCode', 'country', 'latitude', 'longitude'];
    const missingFields = requiredFields.filter(field => !this.location[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required location fields: ${missingFields.join(', ')}`);
    }

    // Generate formatted address if not provided
    if (!this.location.formattedAddress) {
      this.location.formattedAddress = buildLocationAddressString(this.location);
    }

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Job', jobSchema);
