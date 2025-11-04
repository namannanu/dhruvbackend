const mongoose = require('mongoose');

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
    allowedRadius: {
      type: Number,
      default: 150
    },
    formattedAddress: String,
    name: String,
    notes: String,
    timezone: String,
    isActive: { type: Boolean, default: true },
    placeId: String,
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
    location: locationSchema,
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
  if (this.isModified('logo') || this.isModified('logoUrl')) {
    this.logoSmall = undefined;
    this.logoMedium = undefined;
    this.logoSignature = undefined;
    this.logoOptimizedAt = undefined;
  }
  next();
});

module.exports = mongoose.model('Business', businessSchema);
