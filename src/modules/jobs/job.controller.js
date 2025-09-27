const Job = require('./job.model');
const Application = require('../applications/application.model');
const Business = require('../businesses/business.model');
const User = require('../users/user.model');
const EmployerProfile = require('../employers/employerProfile.model');
const WorkerProfile = require('../workers/workerProfile.model');
const WorkerEmployment = require('../workers/workerEmployment.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const { haversine } = require('../../shared/utils/distance');

const JOB_FREE_QUOTA = 20000;///////               change to 2

const buildJobResponse = async (job, currentUser) => {
  const jobObj = job.toObject();
  if (currentUser && currentUser.userType === 'worker') {
    const hasApplied = await Application.exists({ job: job._id, worker: currentUser._id });
    jobObj.hasApplied = Boolean(hasApplied);
    jobObj.premiumRequired =
      !currentUser.premium && currentUser.freeApplicationsUsed >= 3;
  }
  return jobObj;
};

exports.listJobs = catchAsync(async (req, res) => {
  const filter = {};
  
  // Handle different user types
  if (req.user.userType === 'worker') {
    // For workers, show all active jobs except their own (if they're also employers)
    filter.status = 'active';
    filter.employer = { $ne: req.user._id }; // Exclude jobs posted by the worker themselves
  } else if (req.user.userType === 'employer') {
    // For employers, show their own jobs by default, or all if specifically requested
    if (req.query.employerId) {
      filter.employer = req.query.employerId;
    } else if (!req.query.all) {
      filter.employer = req.user._id; // Show only their own jobs
    }
  }
  
  // Additional filters
  if (req.query.businessId) {
    filter.business = req.query.businessId;
  }
  if (req.query.status) {
    filter.status = req.query.status;
  } else if (!filter.status) {
    filter.status = { $ne: 'draft' }; // Exclude drafts for general listing
  }
  if (req.query.tags) {
    filter.tags = { $in: req.query.tags.split(',').map((tag) => tag.trim()) };
  }

  const jobs = await Job.find(filter).populate('business').sort({ createdAt: -1 });
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius);

  const decorated = await Promise.all(
    jobs.map(async (job) => {
      const jobResp = await buildJobResponse(job, req.user);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        const distance = haversine({
          lat1: lat,
          lon1: lng,
          lat2: job.location?.latitude,
          lon2: job.location?.longitude
        });
        jobResp.distance = distance;
        if (!Number.isNaN(radius) && distance !== null && distance > radius) {
          return null;
        }
      }
      return jobResp;
    })
  );

  const filtered = decorated.filter(Boolean);
  res.status(200).json({ status: 'success', results: filtered.length, data: filtered });
});

exports.getJob = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.jobId).populate('business employer');
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  const jobResp = await buildJobResponse(job, req.user);
  res.status(200).json({ status: 'success', data: jobResp });
});

exports.createJob = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Only employers can create jobs', 403));
  }

  if (!req.user.premium && req.user.freeJobsPosted >= JOB_FREE_QUOTA) {
    return next(
      new AppError('Free job posting quota reached. Please upgrade to continue.', 402)
    );
  }

  const businessId = req.body.business || req.user.selectedBusiness;
  if (!businessId) {
    return next(new AppError('Business must be specified for job postings', 400));
  }

  const business = await Business.findById(businessId);
  if (!business || business.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('Invalid business selection', 400));
  }

  const job = await Job.create({
    ...req.body,
    employer: req.user._id,
    business: businessId,
    premiumRequired: !req.user.premium && req.user.freeJobsPosted >= 3
  });

  business.stats.jobsPosted += 1;
  await business.save();

  const employerProfile = await EmployerProfile.findOne({ user: req.user._id });
  if (employerProfile) {
    employerProfile.totalJobsPosted += 1;
    await employerProfile.save();
  }

  if (!req.user.premium) {
    req.user.freeJobsPosted += 1;
    await req.user.save();
  }

  res.status(201).json({ status: 'success', data: job });
});

exports.createJobsBulk = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Only employers can create jobs', 403));
  }
  const jobsPayload = Array.isArray(req.body.jobs) ? req.body.jobs : [];
  if (!jobsPayload.length) {
    return next(new AppError('Provide at least one job payload', 400));
  }

  const cost = jobsPayload.length * 50;
  const createdJobs = await Job.insertMany(
    jobsPayload.map((job) => ({
      ...job,
      employer: req.user._id,
      status: job.status || 'active'
    }))
  );

  await EmployerProfile.updateOne(
    { user: req.user._id },
    { $inc: { totalJobsPosted: createdJobs.length } }
  );

  res.status(201).json({ status: 'success', data: { jobs: createdJobs, totalCost: cost } });
});

exports.updateJob = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  if (job.employer.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only update your own jobs', 403));
  }
  Object.assign(job, req.body);
  await job.save();
  res.status(200).json({ status: 'success', data: job });
});

exports.updateJobStatus = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  if (job.employer.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only update your own jobs', 403));
  }
  job.status = req.body.status;
  await job.save();
  res.status(200).json({ status: 'success', data: job });
});

exports.listApplicationsForJob = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  if (req.user.userType !== 'employer' || job.employer.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to view applications for this job', 403));
  }
  const applications = await Application.find({ job: job._id })
    .populate('worker')
    .sort({ createdAt: -1 });
  res.status(200).json({ status: 'success', data: applications });
});

exports.hireApplicant = catchAsync(async (req, res, next) => {
  const application = await Application.findById(req.params.applicationId).populate('job');
  if (!application) {
    return next(new AppError('Application not found', 404));
  }
  if (application.job.employer.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only hire for your own jobs', 403));
  }

  // Update application status
  application.status = 'hired';
  application.hiredAt = new Date();
  await application.save();

  // Reject other applications for this job
  await Application.updateMany(
    { job: application.job._id, _id: { $ne: application._id } },
    { status: 'rejected', rejectedAt: new Date() }
  );

  // Update job status
  application.job.status = 'filled';
  application.job.hiredWorker = application.worker;
  await application.job.save();

  // Create employment record for hire tracking
  const employmentRecord = await WorkerEmployment.create({
    worker: application.worker,
    employer: req.user._id,
    business: application.job.business,
    job: application.job._id,
    application: application._id,
    hireDate: new Date(),
    employmentStatus: 'active',
    position: application.job.title,
    hourlyRate: application.job.hourlyRate,
    workLocation: application.job.location,
    startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
    endDate: null // Initially null for active employment
  });

  // Update worker profile with current employment info
  await WorkerProfile.updateOne(
    { user: application.worker },
    {
      $inc: { completedJobs: 1 },
      $set: {
        employmentStatus: 'employed',
        currentEmployer: req.user._id,
        hireDate: new Date()
      }
    }
  );

  // Update business and employer stats
  await Business.updateOne(
    { _id: application.job.business },
    { $inc: { 'stats.hires': 1 } }
  );
  await EmployerProfile.updateOne(
    { user: req.user._id },
    { $inc: { totalHires: 1 } }
  );

  // Return enriched response with employment info
  const responseData = {
    ...application.toObject(),
    employmentRecord: {
      employmentId: employmentRecord._id,
      hireDate: employmentRecord.hireDate,
      position: employmentRecord.position,
      hourlyRate: employmentRecord.hourlyRate,
      employmentStatus: employmentRecord.employmentStatus
    }
  };

  res.status(200).json({ 
    status: 'success', 
    message: 'Applicant hired successfully and employment record created',
    data: responseData 
  });
});
