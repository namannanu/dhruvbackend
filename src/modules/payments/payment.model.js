const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    description: String,
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed'],
      default: 'pending'
    },
    reference: { type: String, required: true },
    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
);

paymentSchema.index({ employer: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
