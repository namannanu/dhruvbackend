const mongoose = require('mongoose');

const workerFeedbackSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

workerFeedbackSchema.index(
  { worker: 1, employer: 1, job: 1 },
  { unique: true, sparse: true }
);
workerFeedbackSchema.index({ employer: 1, createdAt: -1 });

module.exports = mongoose.model('WorkerFeedback', workerFeedbackSchema);
