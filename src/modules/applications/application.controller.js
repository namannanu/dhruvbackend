const Application = require('./application.model');
const Job = require('../jobs/job.model');
const WorkerProfile = require('../workers/workerProfile.model');
const User = require('../users/user.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

const APPLICATION_FREE_QUOTA = 3;

exports.createApplication = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'worker') {
    return next(new AppError('Only workers can apply to jobs', 403));
  }

  const job = await Job.findById(req.params.jobId);
  if (!job || job.status !== 'active') {
    return next(new AppError('Job is not available for applications', 400));
  }

  const existing = await Application.findOne({ job: job._id, worker: req.user._id });
  if (existing) {
    return next(new AppError('You have already applied to this job', 400));
  }

  if (!req.user.premium && req.user.freeApplicationsUsed >= APPLICATION_FREE_QUOTA) {
    return next(new AppError('Free application limit reached. Upgrade to continue.', 402));
  }

  const profile = await WorkerProfile.findOne({ user: req.user._id });

  const application = await Application.create({
    job: job._id,
    worker: req.user._id,
    message: req.body.message || '',
    snapshot: {
      name: req.user.fullName,
      email: req.user.email,
      phone: req.user.phone,
      skills: profile?.skills || [],
      experience: profile?.experience || ''
    }
  });

  job.applicantsCount += 1;
  await job.save();

  if (!req.user.premium) {
    req.user.freeApplicationsUsed += 1;
    await req.user.save();
  }

  res.status(201).json({ status: 'success', data: application });
});

exports.listMyApplications = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'worker') {
    return next(new AppError('Only workers can view their applications', 403));
  }
  const applications = await Application.find({ worker: req.user._id })
    .populate('job')
    .sort({ createdAt: -1 });
  res.status(200).json({ status: 'success', data: applications });
});

exports.updateApplication = catchAsync(async (req, res, next) => {
  const application = await Application.findById(req.params.applicationId).populate('job');
  if (!application) {
    return next(new AppError('Application not found', 404));
  }
  if (req.user.userType === 'worker') {
    if (application.worker.toString() !== req.user._id.toString()) {
      return next(new AppError('You can only modify your application', 403));
    }
    if (req.body.status === 'withdrawn') {
      application.status = 'rejected';
      application.rejectedAt = new Date();
    }
    application.message = req.body.message || application.message;
    await application.save();
    return res.status(200).json({ status: 'success', data: application });
  }
  if (req.user.userType === 'employer') {
    if (application.job.employer.toString() !== req.user._id.toString()) {
      return next(new AppError('You can only update applications for your jobs', 403));
    }
    if (!['pending', 'hired', 'rejected'].includes(req.body.status)) {
      return next(new AppError('Invalid status', 400));
    }
    application.status = req.body.status;
    if (req.body.status === 'hired') {
      application.hiredAt = new Date();
    }
    if (req.body.status === 'rejected') {
      application.rejectedAt = new Date();
    }
    await application.save();
    return res.status(200).json({ status: 'success', data: application });
  }
  return next(new AppError('Not authorized to update application', 403));
});

exports.listApplications = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.workerId) {
    filter.worker = req.query.workerId;
  }
  if (req.query.jobId) {
    filter.job = req.query.jobId;
  }
  const applications = await Application.find(filter).populate('job worker');
  res.status(200).json({ status: 'success', data: applications });
});
