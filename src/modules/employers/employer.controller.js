const mongoose = require('mongoose');
const EmployerProfile = require('./employerProfile.model');
const Business = require('../businesses/business.model');
const Job = require('../jobs/job.model');
const Application = require('../applications/application.model');
const WorkerProfile = require('../workers/workerProfile.model');
const { buildApplicationPresenter } = require('../applications/application.presenter');
const AttendanceRecord = require('../attendance/attendance.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const { minimizeProfileImages } = require('../../shared/utils/logoUrlMinimizer');

const ensureEmployer = (req, employerId) => {
  if (req.user.userType !== 'employer') {
    throw new AppError('Only employers can perform this action', 403);
  }
  if (employerId && req.user._id.toString() !== employerId.toString()) {
    throw new AppError('You can only access your own employer data', 403);
  }
};

exports.getEmployerProfile = catchAsync(async (req, res, next) => {
  const employerId = req.params.employerId || req.user._id;
  const profile = await EmployerProfile.findOne({ user: employerId }).populate('defaultBusiness');
  if (!profile) {
    return next(new AppError('Employer profile not found', 404));
  }
  
  // Minimize profile images for faster loading
  const optimizedProfile = minimizeProfileImages(profile, 'employer');
  
  res.status(200).json({ status: 'success', data: optimizedProfile });
});

exports.updateEmployerProfile = catchAsync(async (req, res, next) => {
  ensureEmployer(req, req.params.employerId || req.user._id);
  const updates = ['companyName', 'description', 'phone', 'profilePicture', 'companyLogo'];
  const payload = updates.reduce((acc, key) => {
    if (req.body[key] !== undefined) {
      acc[key] = req.body[key];
    }
    return acc;
  }, {});
  const profile = await EmployerProfile.findOneAndUpdate(
    { user: req.user._id },
    payload,
    { new: true }
  );
  
  // Minimize profile images for response
  const optimizedProfile = minimizeProfileImages(profile, 'employer');
  
  res.status(200).json({ status: 'success', data: optimizedProfile });
});

exports.getDashboard = catchAsync(async (req, res, next) => {
  ensureEmployer(req, req.params.employerId || req.user._id);
  const employerId = req.params.employerId || req.user._id;

  const [jobs, applications, businesses, attendance] = await Promise.all([
    Job.find({ employer: employerId }).sort({ createdAt: -1 }).limit(10),
    Application.find()
      .populate('job')
      .populate('worker')
      .where('job')
      .in(await Job.find({ employer: employerId }).distinct('_id')),
    Business.find({ owner: employerId }),
    AttendanceRecord.find({ employer: employerId }).sort({ scheduledStart: -1 }).limit(10)
  ]);

  const totalJobs = jobs.length;
  const totalApplicants = applications.length;
  const hires = applications.filter((app) => app.status === 'hired').length;
  const filledJobs = jobs.filter((job) => job.status === 'filled').length;

  res.status(200).json({
    status: 'success',
    data: {
      metrics: {
        totalJobs,
        totalApplicants,
        hires,
        filledJobs,
        freeJobsRemaining: Math.max(0, 2 - req.user.freeJobsPosted)
      },
      recentJobs: jobs,
      recentApplications: applications.slice(0, 10),
      businesses,
      attendance
    }
  });
});

exports.listEmployerApplications = catchAsync(async (req, res, next) => {
  const employerId = req.params.employerId || req.user._id;
  ensureEmployer(req, employerId);

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const jobFilter = { employer: employerId };
  if (req.query.businessId) {
    jobFilter.business = req.query.businessId;
  }
  if (req.query.jobId) {
    jobFilter._id = req.query.jobId;
  }

  const jobIds = await Job.distinct('_id', jobFilter);
  const normalizeToObjectId = (value) => {
    if (value instanceof mongoose.Types.ObjectId) {
      return value;
    }
    if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
      return new mongoose.Types.ObjectId(value);
    }
    return null;
  };
  const normalizedJobIds = jobIds.map(normalizeToObjectId).filter(Boolean);

  if (!normalizedJobIds.length) {
    return res.status(200).json({
      status: 'success',
      pagination: { total: 0, page, pages: 0, limit },
      summary: { pending: 0, hired: 0, rejected: 0, withdrawn: 0 },
      data: []
    });
  }

  const filter = { job: { $in: normalizedJobIds } };
  const allowedStatuses = new Set(['pending', 'hired', 'rejected', 'withdrawn']);
  if (req.query.status) {
    const requestedStatuses = req.query.status
      .split(',')
      .map((status) => status.trim().toLowerCase())
      .filter(Boolean);
    const validStatuses = requestedStatuses.filter((status) => allowedStatuses.has(status));
    if (!validStatuses.length) {
      return next(new AppError('Invalid status filter', 400));
    }
    filter.status = validStatuses.length === 1 ? validStatuses[0] : { $in: validStatuses };
  }

  if (req.query.search) {
    const searchTerm = req.query.search.trim();
    if (searchTerm.length) {
      const regex = new RegExp(searchTerm, 'i');
      filter.$or = [
        { 'snapshot.name': regex },
        { 'snapshot.email': regex },
        { 'snapshot.phone': regex },
        { message: regex }
      ];
    }
  }

  const allowedSortFields = new Set([
    'createdAt',
    'status',
    'hiredAt',
    'rejectedAt',
    'withdrawnAt'
  ]);
  const sortBy = allowedSortFields.has(req.query.sortBy) ? req.query.sortBy : 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  const skip = (page - 1) * limit;

  const applicationsQuery = Application.find(filter)
    .populate({
      path: 'job',
      select:
        'title status description hourlyRate business schedule location urgency tags overtime verificationRequired premiumRequired applicantsCount createdAt hiredWorker',
      populate: {
        path: 'business',
        select: 'name description logo logoSmall logoMedium logoUrl location'
      }
    })
    .populate({
      path: 'worker',
      select: 'firstName lastName email phone userType'
    })
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const [applications, total, statusCounts] = await Promise.all([
    applicationsQuery,
    Application.countDocuments(filter),
    Application.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  const summary = {
    pending: 0,
    hired: 0,
    rejected: 0,
    withdrawn: 0
  };
  statusCounts.forEach((item) => {
    if (item && item._id && Object.prototype.hasOwnProperty.call(summary, item._id)) {
      summary[item._id] = item.count;
    }
  });

  const workerIds = new Set();
  applications.forEach((application) => {
    const worker = application.worker;
    if (!worker) return;
    const workerId =
      worker && worker._id
        ? worker._id.toString()
        : typeof worker === 'string'
        ? worker
        : null;
    if (workerId) {
      workerIds.add(workerId);
    }
  });

  const workerProfiles = workerIds.size
    ? await WorkerProfile.find({ user: { $in: Array.from(workerIds) } })
    : [];
  const profileMap = new Map(
    workerProfiles.map((profile) => [profile.user.toString(), profile])
  );

  const formattedApplications = applications.map((application) => {
    const worker = application.worker;
    const workerId =
      worker && worker._id
        ? worker._id.toString()
        : typeof worker === 'string'
        ? worker
        : null;
    const workerProfile = workerId ? profileMap.get(workerId) || null : null;
    return buildApplicationPresenter(application, {
      workerProfile,
      includeApplicantDetails: true
    });
  });

  res.status(200).json({
    status: 'success',
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit
    },
    summary,
    data: formattedApplications
  });
});

exports.getAnalytics = catchAsync(async (req, res, next) => {
  ensureEmployer(req, req.params.employerId || req.user._id);
  const employerId = req.params.employerId || req.user._id;
  const businessId = req.query.businessId;

  const jobFilter = { employer: employerId };
  if (businessId) {
    jobFilter.business = businessId;
  }

  const jobs = await Job.find(jobFilter);
  const jobIds = jobs.map((job) => job._id);
  const applications = await Application.find({ job: { $in: jobIds } });

  const hires = applications.filter((app) => app.status === 'hired');
  const hireRate = applications.length ? hires.length / applications.length : 0;

  const responseTimes = applications
    .filter((app) => app.hiredAt)
    .map((app) => app.hiredAt.getTime() - app.createdAt.getTime());
  const avgResponseMs = responseTimes.length
    ? responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length
    : 0;

  res.status(200).json({
    status: 'success',
    data: {
      totals: {
        jobs: jobs.length,
        applications: applications.length,
        hires: hires.length,
        hireRate
      },
      averageResponseTimeHours: avgResponseMs / (1000 * 60 * 60),
      averageHourlyRate: jobs.length
        ? jobs.reduce((sum, job) => sum + job.hourlyRate, 0) / jobs.length
        : 0
    }
  });
});
