const WorkerProfile = require('./workerProfile.model');
const User = require('../users/user.model');
const Application = require('../applications/application.model');
const AttendanceRecord = require('../attendance/attendance.model');
const Shift = require('../shifts/shift.model');
const SwapRequest = require('../shifts/swapRequest.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const { minimizeProfileImages } = require('../../shared/utils/logoUrlMinimizer');
const { buildApplicationPresenter } = require('../applications/application.presenter');

exports.getWorkerProfile = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  const user = await User.findById(workerId);
  if (!user || user.userType !== 'worker') {
    return next(new AppError('Worker not found', 404));
  }
  const profile = await WorkerProfile.findOne({ user: workerId });
  
  // Minimize profile images for faster loading
  const optimizedProfile = profile ? minimizeProfileImages(profile, 'worker') : null;
  
  res.status(200).json({ status: 'success', data: { user, profile: optimizedProfile } });
});

exports.updateWorkerProfile = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  if (req.user.userType !== 'worker' || req.user._id.toString() !== workerId.toString()) {
    return next(new AppError('You can only update your own profile', 403));
  }
  const allowedFields = ['firstName', 'lastName', 'phone'];
  allowedFields.forEach((field) => {
    if (field in req.body) {
      req.user[field] = req.body[field];
    }
  });
  await req.user.save();

  const profileFields = ['bio', 'skills', 'experience', 'languages', 'profilePicture', 'portfolioImages'];
  const profile = await WorkerProfile.findOneAndUpdate(
    { user: workerId },
    profileFields.reduce((acc, field) => {
      if (field in req.body) {
        acc[field] = req.body[field];
      }
      return acc;
    }, {}),
    { new: true }
  );

  // Minimize profile images for response
  const optimizedProfile = profile ? minimizeProfileImages(profile, 'worker') : null;

  res.status(200).json({ status: 'success', data: { user: req.user, profile: optimizedProfile } });
});

exports.getWorkerApplications = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  if (req.user.userType === 'worker' && req.user._id.toString() !== workerId.toString()) {
    return next(new AppError('You can only view your own applications', 403));
  }
  const applications = await Application.find({ worker: workerId })
    .populate({
      path: 'job',
      select:
        'title status description hourlyRate business schedule location urgency tags overtime verificationRequired premiumRequired applicantsCount',
      populate: {
        path: 'business',
        select: 'name description logo logoSmall logoMedium logoUrl location'
      }
    })
    .populate({
      path: 'worker',
      select: 'firstName lastName email phone userType'
    })
    .sort({ createdAt: -1 });

  const workerProfile = await WorkerProfile.findOne({ user: workerId });

  const data = applications.map((application) =>
    buildApplicationPresenter(application, {
      workerProfile,
      includeApplicantDetails: true
    })
  );

  res.status(200).json({ status: 'success', results: data.length, data });
});

exports.getWorkerAttendance = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  if (req.user.userType === 'worker' && req.user._id.toString() !== workerId.toString()) {
    return next(new AppError('You can only view your own attendance', 403));
  }
  const filter = { worker: workerId };
  if (req.query.date) {
    const targetDate = new Date(req.query.date);
    const start = new Date(targetDate.setHours(0, 0, 0, 0));
    const end = new Date(targetDate.setHours(23, 59, 59, 999));
    filter.scheduledStart = { $gte: start, $lte: end };
  }
  const records = await AttendanceRecord.find(filter).sort({ scheduledStart: -1 });
  res.status(200).json({ status: 'success', results: records.length, data: records });
});

exports.getWorkerShifts = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  if (req.user.userType === 'worker' && req.user._id.toString() !== workerId.toString()) {
    return next(new AppError('You can only view your own shifts', 403));
  }
  const shifts = await Shift.find({ worker: workerId }).sort({ scheduledStart: 1 });
  const swapRequests = await SwapRequest.find({
    $or: [{ fromWorker: workerId }, { toWorker: workerId }]
  })
    .populate('shift')
    .sort({ createdAt: -1 });

  res.status(200).json({ status: 'success', data: { shifts, swapRequests } });
});
