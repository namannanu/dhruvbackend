const WorkerProfile = require('./workerProfile.model');
const User = require('../users/user.model');
const Application = require('../applications/application.model');
const AttendanceRecord = require('../attendance/attendance.model');
const Shift = require('../shifts/shift.model');
const SwapRequest = require('../shifts/swapRequest.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

exports.getWorkerProfile = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  const user = await User.findById(workerId);
  if (!user || user.userType !== 'worker') {
    return next(new AppError('Worker not found', 404));
  }
  const profile = await WorkerProfile.findOne({ user: workerId });
  res.status(200).json({ status: 'success', data: { user, profile } });
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

  const profileFields = ['bio', 'skills', 'experience', 'languages'];
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

  res.status(200).json({ status: 'success', data: { user: req.user, profile } });
});

exports.getWorkerApplications = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  if (req.user.userType === 'worker' && req.user._id.toString() !== workerId.toString()) {
    return next(new AppError('You can only view your own applications', 403));
  }
  const applications = await Application.find({ worker: workerId })
    .populate({ path: 'job', populate: { path: 'business' } })
    .sort({ createdAt: -1 });
  res.status(200).json({ status: 'success', results: applications.length, data: applications });
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
