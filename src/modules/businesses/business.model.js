const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    // Basic address components
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    
    // Google Places API integration
    formattedAddress: { type: String, trim: true }, // From Google Places API
    name: { type: String, trim: true }, // Place name from Google
    placeId: { type: String, trim: true }, // Google Place ID
    
    // GPS Coordinates (required for attendance validation)
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    // Geofencing and validation
    allowedRadius: {
      type: Number,
      default: 150, // Default 150 meters
      min: 10,      // Minimum 10 meters
      max: 5000     // Maximum 5km
    },
    
    // Location metadata
    notes: { type: String, trim: true }, // Instructions for workers
    isActive: { type: Boolean, default: true }, // Can workers clock in here?
    timezone: { type: String, trim: true }, // Location timezone
    
    // Audit fields
    setBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    setAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const logoAssetSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    size: Number, // bytes
    width: Number,
    height: Number,
    storageKey: { type: String, trim: true }, // e.g. S3 key or CDN path
    uploadedAt: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ['url', 'upload', 'generated'],
      default: 'url',
    },
  },
  { _id: false }
);

const logoSchema = new mongoose.Schema(
  {
    original: logoAssetSchema,
    square: logoAssetSchema,
    dominantColor: { type: String, trim: true },
    altText: { type: String, trim: true },
    updatedAt: { type: Date, default: Date.now },
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
    logoUrl: { type: String, trim: true },
    logo: logoSchema,
    location: locationSchema,
    isActive: { type: Boolean, default: true },
    stats: {
      jobsPosted: { type: Number, default: 0 },
      hires: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Business', businessSchema);
