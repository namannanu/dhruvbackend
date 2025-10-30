const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const User = require('../users/user.model');

exports.registerFCMToken = catchAsync(async (req, res, next) => {
  const { fcmToken, platform } = req.body;

  if (!fcmToken) {
    return next(new AppError('FCM token is required', 400));
  }

  // Update user's FCM token
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fcmToken,
        platform: platform || 'unknown',
        fcmTokenUpdatedAt: new Date()
      }
    },
    { new: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  console.log(`📱 FCM token registered for user ${user.email}: ${fcmToken}`);

  res.status(200).json({
    status: 'success',
    message: 'FCM token registered successfully',
    data: {
      userId: user._id,
      fcmToken: user.fcmToken,
      platform: user.platform
    }
  });
});

exports.unregisterFCMToken = catchAsync(async (req, res, next) => {
  // Remove user's FCM token
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        fcmToken: 1,
        platform: 1,
        fcmTokenUpdatedAt: 1
      }
    },
    { new: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  console.log(`📱 FCM token unregistered for user ${user.email}`);

  res.status(200).json({
    status: 'success',
    message: 'FCM token unregistered successfully'
  });
});

exports.sendTestNotification = catchAsync(async (req, res, next) => {
  const notificationService = require('./notification.service');
  
  const { title, message, type = 'system', priority = 'low' } = req.body;

  if (!title || !message) {
    return next(new AppError('Title and message are required', 400));
  }

  // Send notification to the current user
  await notificationService.sendSafeNotification({
    recipient: req.user._id,
    type,
    priority,
    title,
    message,
    metadata: {
      isTest: true,
      sentAt: new Date().toISOString()
    },
    senderUserId: req.user._id
  });

  res.status(200).json({
    status: 'success',
    message: 'Test notification sent successfully'
  });
});