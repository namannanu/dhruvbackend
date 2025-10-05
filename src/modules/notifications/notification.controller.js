const Notification = require('./notification.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

exports.listNotifications = catchAsync(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ status: 'success', results: notifications.length, data: notifications });
});

exports.createNotification = catchAsync(async (req, res) => {
  const notification = await Notification.create({
    ...req.body,
    user: req.body.user || req.user._id
  });
  res.status(201).json({ status: 'success', data: notification });
});

exports.markRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOne({ _id: req.params.notificationId, user: req.user._id });
  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }
  notification.readAt = new Date();
  await notification.save();
  res.status(200).json({ status: 'success', data: notification });
});
