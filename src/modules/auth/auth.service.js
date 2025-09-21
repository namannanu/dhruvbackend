const jwt = require('jsonwebtoken');
const User = require('../users/user.model');
const WorkerProfile = require('../workers/workerProfile.model');
const EmployerProfile = require('../employers/employerProfile.model');
const Business = require('../businesses/business.model');
const AppError = require('../../shared/utils/appError');

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

const buildUserResponse = async (user) => {
  const base = user.toObject({ getters: true });
  delete base.password;

  if (base.userType === 'worker') {
    const profile = await WorkerProfile.findOne({ user: user._id });
    return { user: base, workerProfile: profile };
  }

  const profile = await EmployerProfile.findOne({ user: user._id }).populate('defaultBusiness');
  return { user: base, employerProfile: profile };
};

const createDefaultBusiness = async ({ employerId, companyName }) => {
  const business = await Business.create({
    owner: employerId,
    name: `${companyName} Main Location`,
    description: 'Default location created at signup',
    isActive: true
  });
  return business;
};

exports.signup = async (payload) => {
  const { userType, email } = payload;
  if (!userType || !['worker', 'employer'].includes(userType)) {
    throw new AppError('Invalid user type', 400);
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError('Email already registered', 400);
  }

  const user = await User.create({
    email: email.toLowerCase(),
    password: payload.password,
    userType,
    firstName: payload.firstName || payload.name || '',
    lastName: payload.lastName || '',
    phone: payload.phone || null
  });

  if (userType === 'worker') {
    await WorkerProfile.create({
      user: user._id,
      bio: payload.bio || '',
      skills: payload.skills || [],
      experience: payload.experience || '',
      languages: payload.languages || []
    });
  } else {
    const companyName = payload.companyName || `${user.firstName || 'Employer'} Company`;
    const profile = await EmployerProfile.create({
      user: user._id,
      companyName,
      description: payload.description || '',
      phone: payload.phone || null
    });

    const defaultBusiness = await createDefaultBusiness({
      employerId: user._id,
      companyName
    });
    profile.defaultBusiness = defaultBusiness._id;
    await profile.save();
    user.selectedBusiness = defaultBusiness._id;
    await user.save();
  }

  return buildUserResponse(user);
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }
  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    throw new AppError('Invalid credentials', 401);
  }
  user.lastLoginAt = new Date();
  await user.save();
  return buildUserResponse(user);
};

exports.issueAuthResponse = async (res, data, statusCode = 200) => {
  const token = signToken(data.user._id);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };
  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data
  });
};

exports.getSession = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return buildUserResponse(user);
};

exports.logout = (res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0)
  });
  res.status(200).json({ status: 'success' });
};
