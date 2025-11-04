const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../../modules/users/user.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const extractToken = (req) => {
  const headerValue = req.headers.authorization || req.headers.Authorization;
  if (headerValue) {
    const parts = headerValue.trim().split(/\s+/);
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      return parts[1];
    }
    if (parts.length === 1) {
      return parts[0];
    }
  }

  const fallbacks = [
    'x-auth-token',
    'x-access-token',
    'token',
  ];

  for (const key of fallbacks) {
    if (req.headers[key]) {
      return req.headers[key].trim();
    }
  }

  if (req.cookies?.jwt) {
    return req.cookies.jwt;
  }

  if (typeof req.query?.token === 'string' && req.query.token.trim()) {
    return req.query.token.trim();
  }

  return null;
};

exports.protect = catchAsync(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return next(new AppError('Authentication required. Please log in.', 401));
  }

  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    if (!decoded?.id) {
      return next(new AppError('Invalid authentication token. Please log in again.', 401));
    }

    const currentUser = await User.findById(decoded.id)
      .select('+passwordChangedAt')
      .exec();

    if (!currentUser) {
      return next(new AppError('User account no longer exists or has been disabled.', 401));
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('Password was recently changed. Please log in again.', 401));
    }

    // Update last activity
    currentUser.lastActiveAt = new Date();
    await currentUser.save({ validateBeforeSave: false });

    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid authentication token. Please log in again.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }
    return next(error);
  }
});

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.userType)) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  next();
};
