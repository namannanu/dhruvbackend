const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    body: String,
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const swapRequestSchema = new mongoose.Schema(
  {
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true
    },
    fromWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    toWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    requestedFor: { type: Date },
    messages: { type: [messageSchema], default: [] }
  },
  { timestamps: true }
);

swapRequestSchema.index({ shift: 1, status: 1 });

module.exports = mongoose.model('SwapRequest', swapRequestSchema);
