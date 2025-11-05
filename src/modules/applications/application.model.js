const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    line1: String,
    address: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    latitude: Number,
    longitude: Number
  },
  { _id: false }
);

const snapshotSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    skills: [String],
    experience: String
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true
    },
    location: locationSchema,
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'hired', 'rejected', 'withdrawn'],
      default: 'pending'
    },
    message: { type: String, trim: true },
    snapshot: snapshotSchema,
    hiringNotes: String,
    hiredAt: Date,
    rejectedAt: Date,
    withdrawnAt: Date
  },
  { timestamps: true }
);

applicationSchema.index({ job: 1, worker: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
