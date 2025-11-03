const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    latitude: Number,
    longitude: Number
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
    isActive: { type: Boolean, default: true },
    stats: {
      jobsPosted: { type: Number, default: 0 },
      hires: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Business', businessSchema);
