const mongoose = require('mongoose');

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
    profilePicture: { type: String, trim: true }, // Profile picture URL
    portfolioImages: { type: [String], default: [] }, // Portfolio/work sample images
    rating: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    availability: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkerProfile', workerProfileSchema);
