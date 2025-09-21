const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['application', 'hire', 'payment', 'schedule', 'message', 'system'],
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    actionUrl: { type: String },
    metadata: { type: Object, default: {} },
    readAt: Date
  },
  { timestamps: true }
);

notificationSchema.virtual('isRead').get(function () {
  return Boolean(this.readAt);
});

module.exports = mongoose.model('Notification', notificationSchema);
