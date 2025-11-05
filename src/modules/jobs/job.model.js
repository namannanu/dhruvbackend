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

jobSchema.pre('validate', async function(next) {
  try {
    if (!this.business) {
      throw new Error('Business ID is required');
    }

    // If there's no location at all, try to get it from the business
    if (!this.location || Object.keys(this.location).length === 0) {
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

      this.location = {
        line1: derived.line1,
        address: derived.address || derived.line1,
        city: derived.city,
        state: derived.state,
        postalCode: derived.postalCode,
        country: derived.country,
        latitude: derived.latitude,
        longitude: derived.longitude,
        formattedAddress: derived.formattedAddress || [
          derived.line1,
          derived.city,
          derived.state,
          derived.postalCode,
          derived.country
        ].filter(Boolean).join(', '),
        allowedRadius: derived.allowedRadius || 150
      };
    }

    // Validate all required fields are present and have values
    const requiredFields = ['line1', 'address', 'city', 'state', 'postalCode', 'country', 'latitude', 'longitude'];
    const missingFields = requiredFields.filter(field => {
      const value = this.location[field];
      return value === undefined || value === null || value === '';
    });
    
    if (missingFields.length > 0) {
      throw new Error(`Missing or invalid required location fields: ${missingFields.join(', ')}`);
    }

    // Validate coordinates
    if (this.location.latitude < -90 || this.location.latitude > 90) {
      throw new Error('Invalid latitude. Must be between -90 and 90 degrees');
    }
    if (this.location.longitude < -180 || this.location.longitude > 180) {
      throw new Error('Invalid longitude. Must be between -180 and 180 degrees');
    }

    // Ensure formattedAddress
    if (!this.location.formattedAddress) {
      this.location.formattedAddress = [
        this.location.line1,
        this.location.city,
        this.location.state,
        this.location.postalCode,
        this.location.country
      ].filter(Boolean).join(', ');
    }

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Job', jobSchema);
