const User = require('./user.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

exports.getMe = (req, res) => {
  res.status(200).json({ status: 'success', data: req.user });
};

exports.updateMe = catchAsync(async (req, res, next) => {
  const updates = ['firstName', 'lastName', 'phone'];
  updates.forEach((field) => {
    if (req.body[field] !== undefined) {
      req.user[field] = req.body[field];
    }
  });
  await req.user.save();
  res.status(200).json({ status: 'success', data: req.user });
});

exports.listUsers = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.userType) {
    filter.userType = req.query.userType;
  }
  const users = await User.find(filter).select('-password');
  res.status(200).json({ status: 'success', data: users });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.userId).select('-password');
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  res.status(200).json({ status: 'success', data: user });
});
