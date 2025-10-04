const crypto = require('crypto');
const Payment = require('./payment.model');
const Job = require('../jobs/job.model');
const EmployerProfile = require('../employers/employerProfile.model');
const Business = require('../businesses/business.model');
const User = require('../users/user.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');

// Get payments by userId (public endpoint for team access)
exports.getPaymentsByUserId = catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  // Find user by userId
  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(404).json({
      status: 'fail',
      message: 'User not found with provided userId'
    });
  }
  
  // Get payments for this user
  const payments = await Payment.find({ employer: user._id })
    .populate('employer', 'firstName lastName email userId')
    .sort({ createdAt: -1 });
  
  res.status(200).json({
    status: 'success',
    results: payments.length,
    data: payments
  });
});

exports.processJobPayment = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Only employers can process job payments', 403));
  }
  if (!req.body.job) {
    return next(new AppError('Job payload is required', 400));
  }

  const reference = `pay_${crypto.randomBytes(6).toString('hex')}`;
  const payment = await Payment.create({
    employer: req.user._id,
    amount: req.body.amount || 0,
    currency: req.body.currency || 'USD',
    description: req.body.description || 'Job posting purchase',
    status: 'succeeded',
    reference,
    metadata: { intent: 'job_posting' }
  });

  const job = await Job.create({
    ...req.body.job,
    employer: req.user._id,
    business: req.body.job.business,
    premiumRequired: false,
    status: 'active'
  });

  await EmployerProfile.updateOne(
    { user: req.user._id },
    { $inc: { totalJobsPosted: 1 } }
  );
  await Business.updateOne(
    { _id: job.business },
    { $inc: { 'stats.jobsPosted': 1 } }
  );

  res.status(201).json({ status: 'success', data: { payment, job } });
});
