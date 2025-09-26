const mongoose = require('mongoose');
const EmployerProfile = require('./employerProfile.model');
const Business = require('../businesses/business.model');
const Job = require('../jobs/job.model');
const Application = require('../applications/application.model');
const AttendanceRecord = require('../attendance/attendance.model');
const WorkerEmployment = require('../workers/workerEmployment.model');
const WorkerProfile = require('../workers/workerProfile.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

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
  res.status(200).json({ status: 'success', data: profile });
});

exports.updateEmployerProfile = catchAsync(async (req, res, next) => {
  ensureEmployer(req, req.params.employerId || req.user._id);
  const updates = ['companyName', 'description', 'phone'];
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
  res.status(200).json({ status: 'success', data: profile });
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
      select: 'title status business schedule location createdAt hiredWorker'
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

  res.status(200).json({
    status: 'success',
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit
    },
    summary,
    data: applications
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

// Get all workers hired by this employer
exports.getMyWorkers = catchAsync(async (req, res, next) => {
  const { status = 'active' } = req.query;
  
  const filter = { employer: req.user._id };
  if (status !== 'all') {
    filter.employmentStatus = status;
  }

  const workers = await WorkerEmployment.find(filter)
    .populate('worker', 'firstName lastName email phone')
    .populate('business', 'name')
    .populate('job', 'title')
    .sort({ hireDate: -1 });

  res.status(200).json({
    status: 'success',
    results: workers.length,
    data: workers
  });
});

// Get employment history for a specific worker hired by this employer
exports.getWorkerEmploymentHistory = catchAsync(async (req, res, next) => {
  const { workerId } = req.params;

  const employmentHistory = await WorkerEmployment.find({
    worker: workerId,
    employer: req.user._id
  })
    .populate('business', 'name address')
    .populate('job', 'title description hourlyRate')
    .sort({ hireDate: -1 });

  if (employmentHistory.length === 0) {
    return next(new AppError('No employment history found for this worker', 404));
  }

  res.status(200).json({
    status: 'success',
    results: employmentHistory.length,
    data: employmentHistory
  });
});

// Get scheduled dates for all workers hired by this employer
exports.getWorkersScheduledDates = catchAsync(async (req, res, next) => {
  const { startDate, endDate, status = 'active' } = req.query;

  const filter = { employer: req.user._id };
  if (status !== 'all') {
    filter.employmentStatus = status;
  }

  const workers = await WorkerEmployment.find(filter)
    .populate('worker', 'firstName lastName email')
    .populate('job', 'title startDate endDate workDays workingHours')
    .populate('business', 'name');

  // Group by worker and extract scheduled dates
  const workerSchedules = workers.map(employment => {
    const schedule = {
      workerId: employment.worker._id,
      workerName: `${employment.worker.firstName} ${employment.worker.lastName}`.trim(),
      workerEmail: employment.worker.email,
      employmentId: employment._id,
      business: employment.business.name,
      position: employment.position,
      hireDate: employment.hireDate,
      employmentStatus: employment.employmentStatus,
      hourlyRate: employment.hourlyRate
    };

    if (employment.job) {
      schedule.jobDetails = {
        title: employment.job.title,
        startDate: employment.job.startDate,
        endDate: employment.job.endDate,
        workDays: employment.job.workDays,
        workingHours: employment.job.workingHours
      };

      // Filter by date range if provided
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (employment.job.startDate > end || 
            (employment.job.endDate && employment.job.endDate < start)) {
          return null; // Filter out this worker
        }
      }
    }

    return schedule;
  }).filter(Boolean); // Remove null entries

  res.status(200).json({
    status: 'success',
    results: workerSchedules.length,
    data: workerSchedules
  });
});

// Terminate a worker's employment
exports.terminateWorker = catchAsync(async (req, res, next) => {
  const { workerId } = req.params;
  const { reason } = req.body;

  const employment = await WorkerEmployment.findOne({
    worker: workerId,
    employer: req.user._id,
    employmentStatus: 'active'
  });

  if (!employment) {
    return next(new AppError('Active employment not found for this worker', 404));
  }

  // End the employment
  await employment.endEmployment(reason || 'Employer termination');

  res.status(200).json({
    status: 'success',
    message: 'Worker employment terminated successfully',
    data: employment
  });
});
