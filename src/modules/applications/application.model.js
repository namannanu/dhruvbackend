const mongoose = require('mongoose');

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
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual to access worker userId
applicationSchema.virtual('workerUserId', {
  ref: 'User',
  localField: 'worker',
  foreignField: '_id',
  justOne: true,
  get: function() {
    return this.worker?.userId;
  }
});

// Virtual to access employer userId through job
applicationSchema.virtual('employerUserId', {
  ref: 'Job',
  localField: 'job',
  foreignField: '_id',
  justOne: true,
  get: function() {
    return this.job?.employer?.userId;
  }
});

// Static method to find applications by userId (worker or employer)
applicationSchema.statics.findByUserId = function(userId) {
  return this.find()
    .populate({
      path: 'worker',
      select: 'userId firstName lastName email'
    })
    .populate({
      path: 'job',
      select: 'title hourlyRate status',
      populate: {
        path: 'employer',
        select: 'userId firstName lastName email'
      }
    })
    .then(applications => {
      return applications.filter(app => 
        app.worker?.userId === userId || 
        app.job?.employer?.userId === userId
      );
    });
};

applicationSchema.index({ job: 1, worker: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
