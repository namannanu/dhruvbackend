const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
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
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business'
    },
    scheduledStart: { type: Date, required: true },
    scheduledEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ['assigned', 'swap_requested', 'swap_pending', 'swapped'],
      default: 'assigned'
    },
    canSwap: { type: Boolean, default: true }
  },
  { timestamps: true }
);

shiftSchema.index({ worker: 1, scheduledStart: -1 });

module.exports = mongoose.model('Shift', shiftSchema);
