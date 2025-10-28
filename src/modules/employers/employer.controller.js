const mongoose = require('mongoose');
const EmployerProfile = require('./employerProfile.model');
const Business = require('../businesses/business.model');
const Job = require('../jobs/job.model');
const Application = require('../applications/application.model');
const AttendanceRecord = require('../attendance/attendance.model');
const WorkerEmployment = require('../workers/workerEmployment.model');
const WorkerProfile = require('../workers/workerProfile.model');
const User = require('../users/user.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const {
  ensureBusinessAccess,
  getAccessibleBusinessIds,
} = require('../../shared/utils/businessAccess');
const { resolveOwnershipTag } = require('../../shared/utils/ownershipTag');
const {
  buildLocationLabel,
  buildAttendanceJobLocation,
  clampRadius
} = require('../../shared/utils/location');

const ensureEmployer = async (req, employerId) => {
  if (req.user.userType !== 'employer') {
    throw new AppError('Only employers can perform this action', 403);
  }

  if (!employerId || req.user._id.toString() === employerId.toString()) {
    return req.user._id.toString();
  }

  const accessible = await getAccessibleBusinessIds(req.user);
  if (!accessible.size) {
    throw new AppError('You can only access your own employer data', 403);
  }

  const business = await Business.findOne({
    _id: { $in: Array.from(accessible) },
    owner: employerId,
  }).select('_id');

  if (!business) {
    throw new AppError('You can only access your own employer data', 403);
  }

  return employerId.toString();
};

const resolveEmployerContext = async (req, { requiredPermissions } = {}) => {
  const bodyBusinessId =
    req.body && typeof req.body === 'object' ? req.body.businessId : undefined;

  const businessId =
    req.businessId ||
    req.params.businessId ||
    req.query.businessId ||
    bodyBusinessId;

  if (businessId) {
    const access = await ensureBusinessAccess({
      user: req.user,
      businessId,
      requiredPermissions,
    });

    return {
      business: access.business,
      employerId: access.business.owner.toString(),
      isOwner: access.isOwner,
    };
  }

  const employerId = await ensureEmployer(
    req,
    req.params.employerId || req.user._id.toString()
  );

  return { business: null, employerId, isOwner: req.user._id.toString() === employerId };
};

exports.getEmployerProfile = catchAsync(async (req, res, next) => {
  const { employerId } = await resolveEmployerContext(req);

  const profile = await EmployerProfile.findOne({ user: employerId });
  if (!profile) {
    return next(new AppError('Employer profile not found', 404));
  }
  res.status(200).json({ status: 'success', data: profile });
});

exports.updateEmployerProfile = catchAsync(async (req, res, next) => {
  const { employerId } = await resolveEmployerContext(req, {
    requiredPermissions: 'edit_business_profile',
  });
  const updates = ['companyName', 'description', 'phone'];
  const payload = updates.reduce((acc, key) => {
    if (req.body[key] !== undefined) {
      acc[key] = req.body[key];
    }
    return acc;
  }, {});
  const profile = await EmployerProfile.findOneAndUpdate(
    { user: employerId },
    payload,
    { new: true }
  );
  res.status(200).json({ status: 'success', data: profile });
});

const JOB_FREE_QUOTA = 2;

exports.getDashboard = catchAsync(async (req, res, next) => {
  const { business, employerId } = await resolveEmployerContext(req);

  const jobFilter = business
    ? { business: business._id }
    : { employer: employerId };

  const businessFilter = business ? { _id: business._id } : { owner: employerId };
  const attendanceFilter = business
    ? { business: business._id }
    : { employer: employerId };

  const [jobIds, recentJobs, businesses, attendance, employerUser] = await Promise.all([
    Job.find(jobFilter).distinct('_id'),
    Job.find(jobFilter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(10)
      .populate('business', 'businessName name logoUrl logo')
      .populate('createdBy', 'firstName lastName email'),
    Business.find(businessFilter)
      .select('businessName name address city state postalCode stats owner logoUrl logo')
      .populate('owner', 'firstName lastName email userType'),
    AttendanceRecord.find(attendanceFilter)
      .sort({ scheduledStart: -1 })
      .limit(10)
      .populate('worker', 'firstName lastName email'),
    User.findById(employerId).select('freeJobsPosted premium'),
  ]);

  const applications = jobIds.length
    ? await Application.find({ job: { $in: jobIds } })
        .populate('worker', 'firstName lastName email')
        .populate({
          path: 'job',
          select: 'title status business',
          populate: { path: 'business', select: 'businessName name logoUrl logo owner' }
        })
        .sort({ createdAt: -1 })
    : [];

  const [totalJobsCount, openJobsCount, filledJobsCount] = await Promise.all([
    Job.countDocuments(jobFilter),
    Job.countDocuments({ ...jobFilter, status: 'active' }),
    Job.countDocuments({ ...jobFilter, status: 'filled' }),
  ]);

  const totalApplicants = applications.length;
  const totalHires = applications.filter((app) => app.status === 'hired').length;

  const responseDurations = applications
    .map((app) => {
      const decisionAt = app.hiredAt || app.rejectedAt;
      if (!decisionAt) return null;
      const createdAt = app.createdAt instanceof Date
        ? app.createdAt
        : new Date(app.createdAt);
      const decisionDate = decisionAt instanceof Date
        ? decisionAt
        : new Date(decisionAt);
      const diffHours = (decisionDate.getTime() - createdAt.getTime()) / 36e5;
      return Number.isFinite(diffHours) ? diffHours : null;
    })
    .filter((value) => value !== null);

  const averageResponseTimeHours = responseDurations.length
    ? Number(
        (
          responseDurations.reduce((sum, hours) => sum + hours, 0) /
          responseDurations.length
        ).toFixed(2)
      )
    : 0;

  const freeJobsRemaining = Math.max(
    0,
    JOB_FREE_QUOTA - Number(employerUser?.freeJobsPosted || 0)
  );
  const premiumActive = Boolean(employerUser?.premium);

  const applicationSummary = new Map();
  applications.forEach((application) => {
    const rawJob = application.job;
    const jobId = rawJob && rawJob._id ? rawJob._id.toString() : rawJob?.toString?.() || null;
    if (!jobId) return;
    if (!applicationSummary.has(jobId)) {
      applicationSummary.set(jobId, { applicants: 0, hires: 0 });
    }
    const record = applicationSummary.get(jobId);
    record.applicants += 1;
    if (application.status === 'hired') {
      record.hires += 1;
    }
  });

  const recentJobSummaries = recentJobs.map((job) => {
    const jobId = job._id.toString();
    const counts = applicationSummary.get(jobId) || { applicants: 0, hires: 0 };
    return {
      jobId,
      title: job.title,
      status: job.status,
      applicants: counts.applicants,
      hires: counts.hires,
      updatedAt: job.updatedAt || job.createdAt,
    };
  });

  res.status(200).json({
    status: 'success',
    data: {
      metrics: {
        openJobs: openJobsCount,
        totalApplicants,
        totalHires,
        averageResponseTimeHours,
        freePostingsRemaining: freeJobsRemaining,
        premiumActive,
        recentJobSummaries,
        totalJobs: totalJobsCount,
        filledJobs: filledJobsCount,
      },
      recentJobs,
      recentApplications: applications.slice(0, 10),
      businesses,
      attendance,
    },
  });
});

exports.listEmployerApplications = catchAsync(async (req, res, next) => {
  const { business, employerId } = await resolveEmployerContext(req, {
    requiredPermissions: 'view_applications',
  });

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const accessibleBusinessIds = await getAccessibleBusinessIds(req.user);
  const accessibleBusinessIdArray = Array.from(accessibleBusinessIds);
  const normalizedAccessibleBusinessIds = accessibleBusinessIdArray.map((id) =>
    mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
  );

  let jobFilter;
  if (business) {
    jobFilter = { business: business._id };
  } else if (normalizedAccessibleBusinessIds.length) {
    jobFilter = { business: { $in: normalizedAccessibleBusinessIds } };
  } else {
    jobFilter = { employer: employerId };
  }
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
      select: 'title status business schedule location createdAt hiredWorker employer',
      populate: [
        { path: 'employer', select: 'email firstName lastName userType' },
        {
          path: 'business',
          select: 'businessName name logoUrl logo owner',
          populate: { path: 'owner', select: 'email firstName lastName' }
        }
      ]
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

  const data = applications.map((application) => {
    const plain = application.toObject({ virtuals: true });
    if (req.user.userType === 'employer' && plain.job) {
      const ownershipTag = resolveOwnershipTag(
        req.user,
        plain.job.employer,
        plain.job.business?.owner
      );
      if (ownershipTag) {
        plain.createdByTag = ownershipTag;
        plain.job.createdByTag = ownershipTag;
      }
    }
    return plain;
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
    data
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
    .populate('business', 'name logoUrl logo')
    .populate('job', 'title')
    .sort({ hireDate: -1 });

  res.status(200).json({
    status: 'success',
    results: workers.length,
    data: workers
  });
});

exports.updateEmploymentWorkLocation = catchAsync(async (req, res, next) => {
  const { workerId, employmentId } = req.params;

  const employment = await WorkerEmployment.findOne({
    _id: employmentId,
    worker: workerId
  })
    .populate('business', 'name logoUrl logo owner')
    .populate('worker', 'firstName lastName email');

  if (!employment) {
    return next(new AppError('Employment record not found for this worker', 404));
  }

  await ensureBusinessAccess({
    user: req.user,
    businessId: employment.business?._id,
    requiredPermissions: 'manage_team_members'
  });

  const shouldClear = req.body?.clear === true;

  if (shouldClear) {
    employment.workLocation = undefined;
    employment.workLocationDetails = undefined;
  } else {
    const payload = req.body.location && typeof req.body.location === 'object'
      ? req.body.location
      : req.body;

    const latitude = payload.latitude != null ? Number(payload.latitude) : null;
    const longitude = payload.longitude != null ? Number(payload.longitude) : null;

    if (latitude == null || longitude == null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return next(new AppError('Valid latitude and longitude are required', 400));
    }

    const label = buildLocationLabel(payload) || payload.label || employment.position;
    const allowedRadius = clampRadius(
      payload.allowedRadius != null ? Number(payload.allowedRadius) : undefined
    );
    const now = new Date();

    employment.workLocation = label;
    employment.workLocationDetails = {
      label: payload.label || label,
      formattedAddress: payload.formattedAddress || label,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      postalCode: payload.postalCode,
      latitude,
      longitude,
      allowedRadius,
      placeId: payload.placeId,
      notes: payload.notes,
      timezone: payload.timezone,
      setBy: req.user._id,
      setAt: now
    };
  }

  await employment.save();

  // Synchronize scheduled attendance records for this worker/job
  const attendanceFilter = {
    worker: employment.worker._id,
    job: employment.job,
    status: 'scheduled'
  };

  if (employment.workLocationDetails) {
    const jobLocation = buildAttendanceJobLocation(employment.workLocationDetails);
    if (jobLocation) {
      await AttendanceRecord.updateMany(attendanceFilter, {
        $set: {
          jobLocation,
          locationSnapshot: employment.workLocation || jobLocation.address
        }
      });
    }
  } else {
    await AttendanceRecord.updateMany(attendanceFilter, {
      $unset: { jobLocation: '', locationSnapshot: '' }
    });
  }

  res.status(200).json({
    status: 'success',
    data: employment
  });
});

// Get employment history for a specific worker hired by this employer
exports.getWorkerEmploymentHistory = catchAsync(async (req, res, next) => {
  const { workerId } = req.params;

  const employmentHistory = await WorkerEmployment.find({
    worker: workerId,
    employer: req.user._id
  })
    .populate('business', 'name address logoUrl logo')
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
    .populate('business', 'name logoUrl logo');

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
