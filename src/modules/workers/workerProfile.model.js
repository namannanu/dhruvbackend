const mongoose = require('mongoose');



// Profile picture asset schema (similar to business logo)
const profilePictureAssetSchema = new mongoose.Schema(
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
    data: {
      type: Buffer,
      select: false,
    },
  },
  { _id: false }
);

const profilePictureSchema = new mongoose.Schema(
  {
    original: profilePictureAssetSchema,
    square: profilePictureAssetSchema,
    altText: { type: String, trim: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

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
    
    // Profile picture fields
    profilePictureUrl: { type: String, trim: true },
    profilePicture: profilePictureSchema,
    
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
