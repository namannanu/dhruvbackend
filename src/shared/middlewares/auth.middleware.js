const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../../modules/users/user.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  
  // Check Authorization header first
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // Fallback to cookie
  else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('Authentication required. Please log in.', 401));
  }

  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    console.log('🔍 JWT Debug:', {
      decodedId: decoded.id,
      decodedIat: decoded.iat,
      tokenValid: true
    });
    
    const currentUser = await User.findById(decoded.id)
      .select('+passwordChangedAt')
      .exec();

    console.log('🔍 User Lookup:', {
      userFound: !!currentUser,
      userId: currentUser?._id,
      userType: currentUser?.userType,
      userEmail: currentUser?.email
    });

    if (!currentUser) {
      return next(new AppError('User account no longer exists or has been disabled.', 401));
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('Password was recently changed. Please log in again.', 401));
    }

    // Update last activity
    currentUser.lastActiveAt = new Date();
    await currentUser.save({ validateBeforeSave: false });

    // Attach decoded JWT payload for team management context
    req.user = currentUser;
    req.tokenPayload = decoded; // Includes businessId, teamRole, permissions if available
    
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
  // Add debugging
  console.log('🔍 RestrictTo Debug:', {
    hasUser: !!req.user,
    userType: req.user?.userType,
    userId: req.user?._id,
    userEmail: req.user?.email,
    requiredRoles: roles,
    path: req.path,
    method: req.method
  });

  if (!req.user) {
    console.log('❌ No user in request');
    return next(new AppError('User not found in request', 401));
  }
  
  if (!roles.includes(req.user.userType)) {
    console.log('❌ Role mismatch:', {
      userRole: req.user.userType,
      requiredRoles: roles,
      includes: roles.includes(req.user.userType)
    });
    return next(new AppError(`Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.user.userType}`, 403));
  }
  
  console.log('✅ Authorization successful');
  next();
};
