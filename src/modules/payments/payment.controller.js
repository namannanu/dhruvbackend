const crypto = require('crypto');
const Payment = require('./payment.model');
const Job = require('../jobs/job.model');
const EmployerProfile = require('../employers/employerProfile.model');
const Business = require('../businesses/business.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');

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
    business: req.body.job.business || req.user.selectedBusiness,
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
