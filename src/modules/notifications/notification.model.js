const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    type: {
      type: String,
      enum: [
        'application',
        'application_update',
        'hire',
        'payment',
        'schedule',
        'message',
        'system',
        'team_invite',
        'team_update',
        'attendance'
      ],
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
    metadata: { type: Object, default: () => ({}) },
    readAt: Date
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

notificationSchema.virtual('isRead').get(function () {
  return Boolean(this.readAt);
});

notificationSchema.virtual('body')
  .get(function () {
    return this.message;
  })
  .set(function (value) {
    this.message = value;
  });

module.exports = mongoose.model('Notification', notificationSchema);
