const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    line1: { 
      type: String, 
      required: true,
      trim: true 
    },
    address: { 
      type: String, 
      required: true,
      trim: true 
    },
    city: { 
      type: String, 
      required: true,
      trim: true 
    },
    state: { 
      type: String, 
      required: true,
      trim: true 
    },
    postalCode: { 
      type: String, 
      required: true,
      trim: true 
    },
    country: { 
      type: String, 
      required: true,
      trim: true 
    },
    latitude: { 
      type: Number, 
      required: true,
      validate: {
        validator: function(v) {
          return v >= -90 && v <= 90;
        },
        message: 'Latitude must be between -90 and 90 degrees'
      }
    },
    longitude: { 
      type: Number, 
      required: true,
      validate: {
        validator: function(v) {
          return v >= -180 && v <= 180;
        },
        message: 'Longitude must be between -180 and 180 degrees'
      }
    },
    
    formattedAddress: {
      type: String,
      required: true,
      trim: true
    },
    allowedRadius: {
      type: Number,
      default: 150,
      min: [50, 'Allowed radius must be at least 50 meters'],
      max: [5000, 'Allowed radius cannot exceed 5000 meters']
    },
    notes: { type: String, trim: true },
    timezone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    setBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    setAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    location: { type: locationSchema, required: [true, 'Business location is required'] },
    logo: { type: String, trim: true }, // Full logo URL stored here
    logoSmall: { type: String, trim: true }, // Cached small variant for fast responses
    logoMedium: { type: String, trim: true }, // Cached medium variant
    logoSignature: { type: String, trim: true }, // Hash of current logo source to detect changes
    logoOptimizedAt: { type: Date },
    isActive: { type: Boolean, default: true },
    stats: {
      jobsPosted: { type: Number, default: 0 },
      hires: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

businessSchema.pre('save', function (next) {
  // Reset logo variants if logo is modified
  if (this.isModified('logo') || this.isModified('logoUrl')) {
    this.logoSmall = undefined;
    this.logoMedium = undefined;
    this.logoSignature = undefined;
    this.logoOptimizedAt = undefined;
  }

  // Validate and format location data
  if (this.isModified('location')) {
    const location = this.location;
    
    // Check for required fields
    const requiredFields = ['line1', 'address', 'city', 'state', 'postalCode', 'country', 'latitude', 'longitude'];
    const missingFields = requiredFields.filter(field => !location || !location[field]);
    
    if (missingFields.length > 0) {
      return next(new Error(`Missing required location fields: ${missingFields.join(', ')}`));
    }

    // Generate formatted address if not provided
    if (!location.formattedAddress) {
      location.formattedAddress = [
        location.line1,
        location.city,
        location.state,
        location.postalCode,
        location.country
      ].filter(Boolean).join(', ');
    }

    // Validate coordinates
    if (location.latitude < -90 || location.latitude > 90) {
      return next(new Error('Invalid latitude. Must be between -90 and 90 degrees'));
    }
    if (location.longitude < -180 || location.longitude > 180) {
      return next(new Error('Invalid longitude. Must be between -180 and 180 degrees'));
    }

    // Set metadata
    location.setAt = new Date();
    if (!location.setBy && this.owner) {
      location.setBy = this.owner;
    }
  }

  next();
});

// Add indexes for location-based queries
businessSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
businessSchema.index({ owner: 1, isActive: 1 });
businessSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Business', businessSchema);
