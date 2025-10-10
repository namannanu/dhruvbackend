const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const Notification = require('./notification.model');
const notificationService = require('./notification.service');

exports.listNotifications = catchAsync(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('sender', 'firstName lastName email userType');
  res.status(200).json({ status: 'success', results: notifications.length, data: notifications });
});

exports.createNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.createNotification({
    recipient: req.body.recipient || req.body.user,
    recipientId: req.body.recipientId,
    user: req.body.user,
    type: req.body.type,
    priority: req.body.priority,
    title: req.body.title,
    message: req.body.message,
    body: req.body.body,
    actionUrl: req.body.actionUrl,
    metadata: req.body.metadata,
    sender: req.body.sender,
    senderId: req.body.senderId,
    senderUserId: req.user?._id
  });

  await notification.populate('sender', 'firstName lastName email userType');

  res.status(201).json({ status: 'success', data: notification });
});

exports.markRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOne({ _id: req.params.notificationId, user: req.user._id });
  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }
  notification.readAt = new Date();
  await notification.save();
  await notification.populate('sender', 'firstName lastName email userType');
  res.status(200).json({ status: 'success', data: notification });
});
