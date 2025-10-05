const Subscription = require('./subscription.model');
const User = require('../users/user.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

exports.getMySubscription = catchAsync(async (req, res) => {
  let subscription = await Subscription.findOne({ user: req.user._id });
  if (!subscription) {
    subscription = await Subscription.create({ user: req.user._id });
  }
  res.status(200).json({ status: 'success', data: subscription });
});

exports.upgrade = catchAsync(async (req, res, next) => {
  const plan = req.body.plan || 'premium';
  if (!['premium', 'enterprise'].includes(plan)) {
    return next(new AppError('Unsupported plan', 400));
  }
  const subscription = await Subscription.findOneAndUpdate(
    { user: req.user._id },
    { plan, status: 'active', renewsAt: req.body.renewsAt },
    { new: true, upsert: true }
  );
  await User.updateOne({ _id: req.user._id }, { premium: true });
  res.status(200).json({ status: 'success', data: subscription });
});
