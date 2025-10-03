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
    rating: { type: Number, default: 0 },
    totalJobsPosted: { type: Number, default: 0 },
    totalHires: { type: Number, default: 0 },
    defaultBusiness: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business'
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual to access userId through user reference
employerProfileSchema.virtual('userId', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true,
  get: function() {
    return this.user?.userId;
  }
});

module.exports = mongoose.model('EmployerProfile', employerProfileSchema);
