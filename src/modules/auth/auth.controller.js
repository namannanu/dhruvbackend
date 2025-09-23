const authService = require('./auth.service');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

exports.signup = catchAsync(async (req, res) => {
  const data = await authService.signup(req.body);
  await authService.issueAuthResponse(res, data, 201);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Email and password are required', 400));
  }
  const data = await authService.login({ email, password });
  await authService.issueAuthResponse(res, data, 200);
});

exports.me = catchAsync(async (req, res) => {
  const data = await authService.getSession(req.user._id);
  res.status(200).json({ status: 'success', data });
});

exports.logout = (req, res) => {
  authService.logout(res); // no DB needed
};

exports.refreshToken = catchAsync(async (req, res) => {
  let token = req.headers.authorization?.split(' ')[1];
  if (!token && req.cookies) {
    token = req.cookies.jwt;
  }
  
  if (!token) {
    throw new AppError('No token provided', 401);
  }

  const data = await authService.refreshUserToken(token);
  await authService.issueAuthResponse(res, data, 200);
});
