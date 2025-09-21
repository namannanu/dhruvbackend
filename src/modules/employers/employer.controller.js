const EmployerProfile = require('./employerProfile.model');
const Business = require('../businesses/business.model');
const Job = require('../jobs/job.model');
const Application = require('../applications/application.model');
const AttendanceRecord = require('../attendance/attendance.model');
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
