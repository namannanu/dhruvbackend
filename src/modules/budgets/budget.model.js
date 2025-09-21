const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    allocated: { type: Number, default: 0 },
    spent: { type: Number, default: 0 }
  },
  { _id: false }
);

const alertSchema = new mongoose.Schema(
  {
    category: String,
    threshold: Number,
    currentSpend: Number,
    status: {
      type: String,
      enum: ['ok', 'warning', 'critical'],
      default: 'ok'
    },
    message: String
  },
  { _id: false }
);

const budgetSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      unique: true
    },
    period: { type: String, default: 'monthly' },
    month: Number,
    year: Number,
    totalBudget: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    projections: { type: Number, default: 0 },
    categories: { type: [categorySchema], default: [] },
    alerts: { type: [alertSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Budget', budgetSchema);
