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
  const ownerId = req.user.userType === 'employer' ? req.user._id : req.query.ownerId;
  const filter = ownerId ? { owner: ownerId } : {};
  const businesses = await Business.find(filter);
  res.status(200).json({ status: 'success', results: businesses.length, data: businesses });
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
  res.status(204).json({ status: 'success' });
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
    const members = await TeamMember.find({ business: business._id });
    res.status(200).json({ status: 'success', data: members });
  }),
  create: catchAsync(async (req, res) => {
    const business = await ensureOwner(req.user._id, req.params.businessId);
    const member = await TeamMember.create({
      business: business._id,
      ...req.body
    });
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
