/**
 * Performance Fix for Login Authentication
 * 
 * The login process is taking 30+ seconds due to complex database queries
 * in the buildBusinessCollections function. This file contains optimizations.
 */

// OPTION 1: LAZY LOADING APPROACH
// Modify auth.service.js to defer business collection loading

const buildFastUserResponse = async (user) => {
  const base = user.toObject({ getters: true });
  delete base.password;

  let response = { user: base };

  if (base.userType === 'worker') {
    // For workers, only load profile if needed
    const profile = await WorkerProfile.findOne({ user: user._id }).lean();
    response.workerProfile = profile;
  } else {
    // For employers, defer business loading to separate endpoint
    response.ownedBusinesses = [];
    response.teamBusinesses = [];
    response.needsBusinessLoad = true; // Flag to indicate deferred loading
  }

  return response;
};

// OPTION 2: CACHING APPROACH
// Add caching to frequently accessed business data

const Redis = require('redis');
const redis = Redis.createClient();

const buildCachedBusinessCollections = async (userId) => {
  const cacheKey = `business_collections:${userId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }

  const collections = await buildBusinessCollections(userId);
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(collections));
  
  return collections;
};

// OPTION 3: OPTIMIZED QUERIES
// Use lean() queries and select only necessary fields

const buildOptimizedBusinessCollections = async (userId) => {
  const TeamMember = require('../businesses/teamMember.model');
  const TeamAccess = require('../team/teamAccess.model');
  const User = require('../users/user.model');

  // Get user email efficiently
  const user = await User.findById(userId).select('email').lean();
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const [ownedBusinesses, teamMemberships, teamAccessRecords] = await Promise.all([
    // Use lean() for better performance
    Business.find({ owner: userId })
      .select('name industry createdAt logoUrl logo')
      .lean(),
    
    TeamMember.find({ user: userId, active: true })
      .populate('business', 'name industry createdAt logoUrl logo')
      .lean()
      .sort({ createdAt: -1 }),
    
    TeamAccess.find({ 
      userEmail: user.email.toLowerCase(), 
      status: 'active' 
    })
      .populate('businessContext.businessId', 'name industry createdAt logoUrl logo')
      .lean()
      .sort({ createdAt: -1 })
  ]);

  // Rest of the processing...
  return processBusinessCollections(ownedBusinesses, teamMemberships, teamAccessRecords);
};

// OPTION 4: PAGINATION AND LIMITS
// Limit the number of businesses loaded initially

const buildLimitedBusinessCollections = async (userId, limit = 5) => {
  const TeamMember = require('../businesses/teamMember.model');
  const TeamAccess = require('../team/teamAccess.model');
  const User = require('../users/user.model');

  const user = await User.findById(userId).select('email').lean();
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const [ownedBusinesses, teamMemberships, teamAccessRecords] = await Promise.all([
    Business.find({ owner: userId })
      .select('name industry createdAt logoUrl logo')
      .limit(limit)
      .lean(),
    
    TeamMember.find({ user: userId, active: true })
      .populate('business', 'name industry createdAt logoUrl logo')
      .limit(limit)
      .lean()
      .sort({ createdAt: -1 }),
    
    TeamAccess.find({ 
      userEmail: user.email.toLowerCase(), 
      status: 'active' 
    })
      .populate('businessContext.businessId', 'name industry createdAt logoUrl logo')
      .limit(limit)
      .lean()
      .sort({ createdAt: -1 })
  ]);

  return processBusinessCollections(ownedBusinesses, teamMemberships, teamAccessRecords);
};

// OPTION 5: BACKGROUND LOADING
// Load user immediately, then load businesses in background

const loginWithDeferredLoading = async ({ email, password }) => {
  // Fast login response
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

  // Fast response
  const fastResponse = await buildFastUserResponse(user);
  
  // Trigger background loading (don't await)
  if (user.userType === 'employer') {
    setImmediate(async () => {
      try {
        await buildBusinessCollections(user._id);
        // Could emit an event or update cache here
      } catch (error) {
        console.error('Background business loading failed:', error);
      }
    });
  }

  return fastResponse;
};

module.exports = {
  buildFastUserResponse,
  buildCachedBusinessCollections,
  buildOptimizedBusinessCollections,
  buildLimitedBusinessCollections,
  loginWithDeferredLoading
};