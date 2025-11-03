const mongoose = require('mongoose');

const employerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    companyName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    phone: { type: String, trim: true },
    profilePicture: { type: String, trim: true }, // Profile picture URL
    companyLogo: { type: String, trim: true }, // Company logo URL
    rating: { type: Number, default: 0 },
    totalJobsPosted: { type: Number, default: 0 },
    totalHires: { type: Number, default: 0 },
    defaultBusiness: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmployerProfile', employerProfileSchema);
