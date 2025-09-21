const AttendanceRecord = require('./attendance.model');
const Job = require('../jobs/job.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');

const HOURS_IN_MS = 1000 * 60 * 60;

exports.listAttendance = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.workerId) {
    filter.worker = req.query.workerId;
  }
  if (req.query.businessId) {
    filter.business = req.query.businessId;
  }
  if (req.query.date) {
    const date = new Date(req.query.date);
    const start = new Date(date.setHours(0, 0, 0, 0));
    const end = new Date(date.setHours(23, 59, 59, 999));
    filter.scheduledStart = { $gte: start, $lte: end };
  }
  const records = await AttendanceRecord.find(filter).sort({ scheduledStart: -1 });
  res.status(200).json({ status: 'success', results: records.length, data: records });
});

exports.scheduleAttendance = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Only employers can schedule attendance', 403));
  }
  const job = await Job.findById(req.body.job);
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  const record = await AttendanceRecord.create({
    ...req.body,
    employer: req.user._id,
    business: job.business
  });
  res.status(201).json({ status: 'success', data: record });
});

exports.clockIn = catchAsync(async (req, res, next) => {
  const record = await AttendanceRecord.findById(req.params.recordId);
  if (!record) {
    return next(new AppError('Attendance record not found', 404));
  }
  if (req.user.userType === 'worker' && record.worker.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only clock in for your own shift', 403));
  }
  if (record.clockInAt) {
    return next(new AppError('Already clocked in', 400));
  }
  const now = new Date();
  record.clockInAt = now;
  record.status = 'clocked-in';
  if (now > record.scheduledStart) {
    record.isLate = true;
  }
  await record.save();
  res.status(200).json({ status: 'success', data: record });
});

exports.clockOut = catchAsync(async (req, res, next) => {
  const record = await AttendanceRecord.findById(req.params.recordId);
  if (!record) {
    return next(new AppError('Attendance record not found', 404));
  }
  if (req.user.userType === 'worker' && record.worker.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only clock out for your own shift', 403));
  }
  if (!record.clockInAt) {
    return next(new AppError('Clock in before clocking out', 400));
  }
  if (record.clockOutAt) {
    return next(new AppError('Already clocked out', 400));
  }
  record.clockOutAt = new Date();
  record.status = 'completed';
  const durationHours = (record.clockOutAt - record.clockInAt) / HOURS_IN_MS;
  record.totalHours = Number(durationHours.toFixed(2));
  record.earnings = record.totalHours * (req.body.hourlyRate || 0);
  await record.save();
  res.status(200).json({ status: 'success', data: record });
});

exports.updateAttendance = catchAsync(async (req, res, next) => {
  const record = await AttendanceRecord.findById(req.params.recordId);
  if (!record) {
    return next(new AppError('Attendance record not found', 404));
  }
  if (req.user.userType !== 'employer' || record.employer?.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the owning employer can update attendance', 403));
  }
  Object.assign(record, req.body);
  await record.save();
  res.status(200).json({ status: 'success', data: record });
});
