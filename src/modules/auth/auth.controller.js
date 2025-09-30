const authService = require('./auth.service');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const { getUserPermissions } = require('../../shared/middlewares/permissionMiddleware');
const TeamMember = require('../businesses/teamMember.model');

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

exports.getUserPermissions = catchAsync(async (req, res) => {
  const { businessId } = req.query;
  
  if (!businessId) {
    return res.status(400).json({
      status: 'fail',
      message: 'Business ID is required'
    });
  }

  console.log(`🔄 Getting permissions for user ${req.user._id} and business ${businessId}`);
  
  const permissions = await getUserPermissions(req.user._id, businessId);
  
  console.log(`✅ Found ${permissions.length} permissions for user:`, permissions);
  
  res.status(200).json({
    status: 'success',
    permissions
  });
});

exports.getUserTeamMemberInfo = catchAsync(async (req, res) => {
  const { businessId } = req.query;
  
  if (!businessId) {
    return res.status(400).json({
      status: 'fail',
      message: 'Business ID is required'
    });
  }

  console.log(`🔄 Getting team member info for user ${req.user._id} and business ${businessId}`);
  
  const teamMember = await TeamMember.findOne({
    user: req.user._id,
    business: businessId,
    active: true
  }).populate('user', 'firstName lastName email');

  if (!teamMember) {
    return res.status(404).json({
      status: 'fail',
      message: 'User is not a team member of this business'
    });
  }

  console.log(`✅ Found team member: ${teamMember.user.email} with role: ${teamMember.role}`);
  
  res.status(200).json({
    status: 'success',
    teamMember
  });
});
