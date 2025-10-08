const jwt = require('jsonwebtoken');
const User = require('../users/user.model');
const WorkerProfile = require('../workers/workerProfile.model');
const EmployerProfile = require('../employers/employerProfile.model');
const Business = require('../businesses/business.model');
const AppError = require('../../shared/utils/appError');

const ensureJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new AppError('JWT secret is not configured on the server', 500);
  }
};

const signToken = (payload) => {
  ensureJwtSecret();
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const buildBusinessCollections = async (userId) => {
  const TeamMember = require('../businesses/teamMember.model');

  const [ownedBusinesses, teamMemberships] = await Promise.all([
    Business.find({ owner: userId }).select('name industry createdAt'),
    TeamMember.find({ user: userId, active: true })
      .populate('business', 'name industry createdAt')
      .sort({ createdAt: -1 })
  ]);

  return {
    ownedBusinesses: ownedBusinesses.map((business) => ({
      businessId: business._id,
      businessName: business.name,
      industry: business.industry || null,
      createdAt: business.createdAt
    })),
    teamBusinesses: teamMemberships
      .filter((membership) => membership.business)
      .map((membership) => ({
        businessId: membership.business._id,
        businessName: membership.business.name,
        industry: membership.business.industry || null,
        role: membership.role,
        permissions: membership.permissions,
        joinedAt: membership.createdAt
      })),
    teamMemberships
  };
};

const buildUserResponse = async (user, includeTeamContext = true) => {
  const base = user.toObject({ getters: true });
  delete base.password;

  let response = { user: base };

  if (base.userType === 'worker') {
    const profile = await WorkerProfile.findOne({ user: user._id });
    response.workerProfile = profile;
  } else {
    const [profile, businessCollections] = await Promise.all([
      EmployerProfile.findOne({ user: user._id }),
      buildBusinessCollections(user._id)
    ]);

    response.employerProfile = profile;
    response.ownedBusinesses = businessCollections.ownedBusinesses;
    response.teamBusinesses = businessCollections.teamBusinesses;

    if (includeTeamContext) {
      const teamMember = businessCollections.teamMemberships[0];
      if (teamMember) {
        response.teamMember = teamMember;
        response.businessContext = {
          businessId: teamMember.business._id,
          businessName: teamMember.business.name,
          role: teamMember.role,
          permissions: teamMember.permissions
        };
      }
    }
  }

  return response;
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
    await EmployerProfile.create({
      user: user._id,
      companyName: payload.companyName || `${user.firstName || 'Employer'} Company`,
      description: payload.description || '',
      phone: payload.phone || null
    });
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
  // Build JWT payload with team management context
  const jwtPayload = {
    id: data.user._id,
    role: data.user.userType
  };

  // Add business context for employers with team memberships
  if (data.businessContext) {
    jwtPayload.businessId = data.businessContext.businessId;
    jwtPayload.teamRole = data.businessContext.role;
    jwtPayload.permissions = data.businessContext.permissions;
  }

  const token = signToken(jwtPayload);
  
  // Set Access-Control-Allow-Credentials header
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Set cookie for web clients
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined
  };
  res.cookie('jwt', token, cookieOptions);

  // Include token in response body for mobile clients
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      ...data,
      tokenExpiry: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days in milliseconds
    }
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

exports.refreshUserToken = async (token) => {
  const { promisify } = require('util');
  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    if (user.changedPasswordAfter(decoded.iat)) {
      throw new AppError('Password was changed. Please login again', 401);
    }

    return buildUserResponse(user);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token. Please login again', 401);
    }
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired. Please login again', 401);
    }
    throw error;
  }
};

// New function for switching business context for team members
exports.switchBusinessContext = async (userId, businessId) => {
  const TeamMember = require('../businesses/teamMember.model');
  
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify user is a team member of the requested business
  const teamMember = await TeamMember.findOne({ 
    user: userId, 
    business: businessId, 
    active: true 
  }).populate('business', 'name industry');

  if (!teamMember) {
    throw new AppError('You are not a member of this business', 403);
  }

  // Build response with specific business context
  const response = await buildUserResponse(user, false); // Don't auto-include team context
  response.teamMember = teamMember;
  response.businessContext = {
    businessId: teamMember.business._id,
    businessName: teamMember.business.name,
    role: teamMember.role,
    permissions: teamMember.permissions
  };

  return response;
};

// Get all businesses where user is a team member
exports.getUserBusinesses = async (userId) => {
  const { ownedBusinesses, teamBusinesses } = await buildBusinessCollections(userId);

  return {
    ownedBusinesses,
    teamBusinesses
  };
};
