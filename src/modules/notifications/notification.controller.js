const Notification = require('./notification.model');
const User = require('../users/user.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

// Get notifications by userId (public endpoint for team access)
exports.getNotificationsByUserId = catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  // Find user by userId
  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(404).json({
      status: 'fail',
      message: 'User not found with provided userId'
    });
  }
  
  // Get notifications for this user
  const notifications = await Notification.find({ user: user._id })
    .sort({ createdAt: -1 });
  
  res.status(200).json({
    status: 'success',
    results: notifications.length,
    data: notifications
  });
});

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
