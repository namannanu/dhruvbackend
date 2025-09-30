const Business = require('./business.model');
const TeamMember = require('./teamMember.model');
const User = require('../users/user.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

const ensureOwner = async (userId, businessId) => {
  const business = await Business.findById(businessId);
  if (!business) {
    throw new AppError('Business not found', 404);
  }
  if (business.owner.toString() !== userId.toString()) {
    throw new AppError('You do not own this business', 403);
  }
  return business;
};

exports.listBusinesses = catchAsync(async (req, res) => {
  let filter = {};

  if (req.user.userType === 'employer') {
    // Employers can ONLY see their own businesses
    filter.owner = req.user._id;
  } else if (req.user.userType === 'admin' && req.query.ownerId) {
    // Admins can query any employer’s businesses
    filter.owner = req.query.ownerId;
  }

  const businesses = await Business.find(filter);

  res.status(200).json({
    status: 'success',
    results: businesses.length,
    data: businesses
  });
});




exports.createBusiness = catchAsync(async (req, res) => {
  if (req.user.userType !== 'employer') {
    throw new AppError('Only employers can create businesses', 403);
  }
  const business = await Business.create({
    ...req.body,
    owner: req.user._id
  });
  res.status(201).json({ status: 'success', data: business });
});

exports.updateBusiness = catchAsync(async (req, res) => {
  const business = await ensureOwner(req.user._id, req.params.businessId);
  Object.assign(business, req.body);
  await business.save();
  res.status(200).json({ status: 'success', data: business });
});

exports.deleteBusiness = catchAsync(async (req, res) => {
  const business = await ensureOwner(req.user._id, req.params.businessId);
  const totalBusinesses = await Business.countDocuments({ owner: req.user._id });
  if (totalBusinesses <= 1) {
    throw new AppError('Employers must keep at least one business location', 400);
  }
  await business.deleteOne();
  await TeamMember.deleteMany({ business: business._id });
  res.status(204).end();
});

exports.selectBusiness = catchAsync(async (req, res) => {
  const business = await ensureOwner(req.user._id, req.params.businessId);
  req.user.selectedBusiness = business._id;
  await req.user.save();
  res.status(200).json({ status: 'success', data: { selectedBusiness: business } });
});

exports.manageTeamMember = {
  list: catchAsync(async (req, res) => {
    const business = await ensureOwner(req.user._id, req.params.businessId);
    const members = await TeamMember.find({ business: business._id }).populate('user', 'firstName lastName email phone');
    res.status(200).json({ status: 'success', data: members });
  }),
  create: catchAsync(async (req, res) => {
    const business = await ensureOwner(req.user._id, req.params.businessId);
    
    console.log('🔄 Creating team member with request body:', req.body);
    
    const { email, name, role, permissions } = req.body;
    
    if (!email) {
      throw new AppError('Email is required', 400);
    }
    
    console.log(`📧 Looking for user with email: ${email}`);
    
    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('👤 User not found, creating new user');
      // Create a placeholder user for the invitation
      user = await User.create({
        email: email.toLowerCase(),
        firstName: name ? name.split(' ')[0] : email.split('@')[0],
        lastName: name ? name.split(' ').slice(1).join(' ') : '',
        userType: 'employer', // Default type for team members
        password: 'temp_password_' + Math.random().toString(36).substring(7), // Temporary password
        // Note: User should be prompted to set a real password when they first log in
      });
      console.log('✅ Created new user:', user._id);
    } else {
      console.log('✅ Found existing user:', user._id);
    }
    
    // Check if team member already exists
    const existingMember = await TeamMember.findOne({
      business: business._id,
      user: user._id
    });
    
    if (existingMember) {
      throw new AppError('User is already a team member of this business', 400);
    }
    
    console.log('🔄 Creating team member record');
    
    const member = await TeamMember.create({
      business: business._id,
      user: user._id,
      name: name || `${user.firstName} ${user.lastName}`.trim(),
      email: email.toLowerCase(),
      role: role || 'staff',
      permissions: permissions || [],
      isActive: true
    });
    
    console.log('✅ Created team member:', member._id);
    
    // Populate the user data before sending response
    await member.populate('user', 'firstName lastName email');
    
    console.log('📤 Sending response with populated member data');
    
    res.status(201).json({ status: 'success', data: member });
  }),
  update: catchAsync(async (req, res) => {
    const business = await ensureOwner(req.user._id, req.params.businessId);
    const member = await TeamMember.findOneAndUpdate(
      { business: business._id, _id: req.params.memberId },
      req.body,
      { new: true }
    );
    if (!member) {
      throw new AppError('Team member not found', 404);
    }
    res.status(200).json({ status: 'success', data: member });
  }),
  remove: catchAsync(async (req, res) => {
    const business = await ensureOwner(req.user._id, req.params.businessId);
    const deleted = await TeamMember.findOneAndDelete({
      business: business._id,
      _id: req.params.memberId
    });
    if (!deleted) {
      throw new AppError('Team member not found', 404);
    }
    res.status(204).json({ status: 'success' });
  })
};
