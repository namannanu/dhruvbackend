const AttendanceRecord = require('./attendance.model');
const Job = require('../jobs/job.model');
const User = require('../users/user.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');

const HOURS_IN_MS = 1000 * 60 * 60;

const roundToTwo = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const buildDayRange = (dateInput) => {
  const base = new Date(dateInput);
  if (Number.isNaN(base.valueOf())) {
    return null;
  }
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const toTimeString = (value) => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const toDateString = (value) => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }
  return date.toISOString().split('T')[0];
};

const toIdString = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Object && value._id) {
    return value._id.toString();
  }
  if (value.toString) {
    return value.toString();
  }
  return null;
};

const buildWorkerName = (worker, snapshot) => {
  if (snapshot) {
    return snapshot;
  }
  if (!worker) {
    return 'Unknown Worker';
  }
  if (worker.fullName) {
    return worker.fullName;
  }
  const parts = [worker.firstName, worker.lastName].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ');
  }
  if (worker.email) {
    return worker.email;
  }
  return 'Unknown Worker';
};

const pickJobLocationSnapshot = (job) => {
  if (!job) return null;
  
  // First try job's location
  const jobLocation = job.location;
  if (jobLocation) {
    return {
      line1: jobLocation.line1,
      address: jobLocation.address,
      city: jobLocation.city,
      state: jobLocation.state,
      postalCode: jobLocation.postalCode,
      country: jobLocation.country,
      latitude: jobLocation.latitude,
      longitude: jobLocation.longitude,
      name: jobLocation.name || `${job.title} Location`,
      description: jobLocation.description,
      isActive: true
    };
  }
  
  // If no job location, try business location
  if (job.business && job.business.location) {
    const bizLocation = job.business.location;
    return {
      line1: bizLocation.line1,
      address: bizLocation.address,
      city: bizLocation.city,
      state: bizLocation.state,
      postalCode: bizLocation.postalCode,
      country: bizLocation.country,
      latitude: bizLocation.latitude,
      longitude: bizLocation.longitude,
      name: bizLocation.name || `${job.business.name} Location`,
      description: bizLocation.description,
      isActive: true
    };
  }
  
  return null;
};

const buildLocationLabel = (record) => {
  if (record.locationSnapshot) {
    return record.locationSnapshot;
  }
  const fromJob = pickJobLocationSnapshot(record.job);
  if (fromJob) {
    return fromJob;
  }
  return 'Location TBD';
};

const resolveHourlyRate = (record) => {
  if (typeof record.hourlyRate === 'number') {
    return record.hourlyRate;
  }
  if (record.job && typeof record.job.hourlyRate === 'number') {
    return record.job.hourlyRate;
  }
  return 0;
};

const mapRecordToManagementView = (record) => {
  if (!record) {
    return null;
  }
  const scheduledStart = record.scheduledStart ? new Date(record.scheduledStart) : null;
  const scheduledEnd = record.scheduledEnd ? new Date(record.scheduledEnd) : null;
  const dto = {
    id: toIdString(record._id),
    workerId: toIdString(record.worker),
    workerName: buildWorkerName(record.worker, record.workerNameSnapshot),
    jobId: toIdString(record.job),
    jobTitle: record.jobTitleSnapshot || record.job?.title || 'Untitled Role',
    location: buildLocationLabel(record),
    date: toDateString(scheduledStart),
    clockIn: toTimeString(record.clockInAt),
    clockOut: toTimeString(record.clockOutAt),
    totalHours: Number(record.totalHours || 0),
    hourlyRate: resolveHourlyRate(record),
    earnings: Number(record.earnings || 0),
    status: record.status,
    isLate: Boolean(record.isLate),
    scheduledStart: toTimeString(scheduledStart),
    scheduledEnd: toTimeString(scheduledEnd)
  };
  return dto;
};

const buildManagementSummary = (records) => {
  const initial = {
    totalWorkers: 0,
    completedShifts: 0,
    totalHours: 0,
    totalPayroll: 0,
    lateArrivals: 0
  };
  return records.reduce((acc, record) => {
    acc.totalWorkers += 1;
    if (record.status === 'completed') {
      acc.completedShifts += 1;
    }
    if (record.isLate) {
      acc.lateArrivals += 1;
    }
    acc.totalHours = roundToTwo(acc.totalHours + (record.totalHours || 0));
    acc.totalPayroll = roundToTwo(acc.totalPayroll + (record.earnings || 0));
    return acc;
  }, initial);
};

exports.listAttendance = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.workerId) {
    filter.worker = req.query.workerId;
  }
  if (req.query.businessId) {
    filter.business = req.query.businessId;
  }
  if (req.query.date) {
    const range = buildDayRange(req.query.date);
    if (!range) {
      return next(new AppError('Invalid date parameter', 400));
    }
    filter.scheduledStart = { $gte: range.start, $lte: range.end };
  }
  if (req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status;
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
  const worker = await User.findById(req.body.worker);
  if (!worker) {
    return next(new AppError('Worker not found', 404));
  }
  const hourlyRate = typeof req.body.hourlyRate === 'number' ? req.body.hourlyRate : job.hourlyRate;
  const workerNameSnapshot = req.body.workerNameSnapshot || buildWorkerName(worker, null);
  const jobTitleSnapshot = req.body.jobTitleSnapshot || job.title;
  const locationSnapshot = req.body.locationSnapshot || pickJobLocationSnapshot(job);
  const record = await AttendanceRecord.create({
    ...req.body,
    employer: req.user._id,
    business: job.business,
    hourlyRate,
    workerNameSnapshot,
    jobTitleSnapshot,
    locationSnapshot
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
  await record.populate([
    { path: 'job', select: 'hourlyRate location title' },
    { path: 'worker', select: 'firstName lastName email' }
  ]);
  const now = new Date();
  record.clockInAt = now;
  record.status = 'clocked-in';
  if (now > record.scheduledStart) {
    record.isLate = true;
  }
  if (!record.hourlyRate && record.job?.hourlyRate) {
    record.hourlyRate = record.job.hourlyRate;
  }
  if (!record.workerNameSnapshot && record.worker) {
    record.workerNameSnapshot = buildWorkerName(record.worker, null);
  }
  if (!record.jobTitleSnapshot && record.job) {
    record.jobTitleSnapshot = record.job.title;
  }
  if (!record.locationSnapshot) {
    const locationFromJob = pickJobLocationSnapshot(record.job);
    if (locationFromJob) {
      record.locationSnapshot = locationFromJob;
    }
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
  await record.populate([
    { path: 'job', select: 'hourlyRate location title' },
    { path: 'worker', select: 'firstName lastName email' }
  ]);
  record.clockOutAt = new Date();
  record.status = 'completed';
  const durationHours = (record.clockOutAt - record.clockInAt) / HOURS_IN_MS;
  record.totalHours = roundToTwo(durationHours);
  const resolvedRate = typeof req.body.hourlyRate === 'number'
    ? req.body.hourlyRate
    : resolveHourlyRate(record);
  record.hourlyRate = resolvedRate;
  record.earnings = roundToTwo(record.totalHours * resolvedRate);
  if (!record.workerNameSnapshot && record.worker) {
    record.workerNameSnapshot = buildWorkerName(record.worker, null);
  }
  if (!record.jobTitleSnapshot && record.job) {
    record.jobTitleSnapshot = record.job.title;
  }
  if (!record.locationSnapshot) {
    const locationFromJob = pickJobLocationSnapshot(record.job);
    if (locationFromJob) {
      record.locationSnapshot = locationFromJob;
    }
  }
  await record.save();
  res.status(200).json({ status: 'success', data: record });
});

exports.getManagementView = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Only employers can access attendance management', 403));
  }
  if (!req.query.date) {
    return next(new AppError('The date query parameter is required', 400));
  }
  const range = buildDayRange(req.query.date);
  if (!range) {
    return next(new AppError('Invalid date parameter', 400));
  }
  const filter = {
    employer: req.user._id,
    scheduledStart: { $gte: range.start, $lte: range.end }
  };
  if (req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status;
  }
  if (req.query.workerId) {
    filter.worker = req.query.workerId;
  }
  if (req.query.jobId) {
    filter.job = req.query.jobId;
  }
  if (req.query.businessId) {
    filter.business = req.query.businessId;
  }
  const records = await AttendanceRecord.find(filter)
    .populate([
      { path: 'worker', select: 'firstName lastName email' },
      { path: 'job', select: 'title hourlyRate location business' }
    ])
    .sort({ scheduledStart: 1 })
    .lean();
  const managementRecords = records.map(mapRecordToManagementView).filter(Boolean);
  const summary = buildManagementSummary(managementRecords);
  res.status(200).json({
    status: 'success',
    data: {
      records: managementRecords,
      summary
    }
  });
});

exports.markComplete = catchAsync(async (req, res, next) => {
  const record = await AttendanceRecord.findById(req.params.recordId);
  if (!record) {
    return next(new AppError('Attendance record not found', 404));
  }
  if (record.employer?.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the owning employer can update this record', 403));
  }
  if (!record.clockInAt) {
    return next(new AppError('Clock in before marking complete', 400));
  }
  if (record.status !== 'clocked-in') {
    return next(new AppError('Only clocked-in shifts can be marked complete', 400));
  }
  await record.populate([
    { path: 'job', select: 'title hourlyRate location' },
    { path: 'worker', select: 'firstName lastName email' }
  ]);
  const scheduledEnd = record.scheduledEnd ? new Date(record.scheduledEnd) : null;
  const effectiveClockOut = scheduledEnd && scheduledEnd > record.clockInAt ? scheduledEnd : new Date();
  record.clockOutAt = effectiveClockOut;
  record.status = 'completed';
  const durationHours = Math.max(0, (effectiveClockOut - record.clockInAt) / HOURS_IN_MS);
  record.totalHours = roundToTwo(durationHours);
  const hourlyRate = resolveHourlyRate(record);
  record.hourlyRate = hourlyRate;
  record.earnings = roundToTwo(record.totalHours * hourlyRate);
  if (!record.workerNameSnapshot && record.worker) {
    record.workerNameSnapshot = buildWorkerName(record.worker, null);
  }
  if (!record.jobTitleSnapshot && record.job) {
    record.jobTitleSnapshot = record.job.title;
  }
  if (!record.locationSnapshot) {
    const locationFromJob = pickJobLocationSnapshot(record.job);
    if (locationFromJob) {
      record.locationSnapshot = locationFromJob;
    }
  }
  await record.save();
  const dto = mapRecordToManagementView(
    record.toObject({ virtuals: true })
  );
  res.status(200).json({ status: 'success', data: dto });
});

exports.updateHours = catchAsync(async (req, res, next) => {
  const { totalHours, hourlyRate } = req.body;
  if (totalHours === undefined) {
    return next(new AppError('totalHours is required', 400));
  }
  const parsedHours = Number(totalHours);
  if (!Number.isFinite(parsedHours) || parsedHours < 0) {
    return next(new AppError('totalHours must be a non-negative number', 400));
  }
  const record = await AttendanceRecord.findById(req.params.recordId);
  if (!record) {
    return next(new AppError('Attendance record not found', 404));
  }
  if (record.employer?.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the owning employer can update this record', 403));
  }
  await record.populate([
    { path: 'job', select: 'title hourlyRate location' },
    { path: 'worker', select: 'firstName lastName email' }
  ]);
  const resolvedRate =
    hourlyRate !== undefined ? Number(hourlyRate) : resolveHourlyRate(record);
  if (!Number.isFinite(resolvedRate) || resolvedRate < 0) {
    return next(new AppError('hourlyRate must be a non-negative number', 400));
  }
  record.totalHours = roundToTwo(parsedHours);
  record.hourlyRate = resolvedRate;
  record.earnings = roundToTwo(record.totalHours * resolvedRate);
  if (!record.workerNameSnapshot && record.worker) {
    record.workerNameSnapshot = buildWorkerName(record.worker, null);
  }
  if (!record.jobTitleSnapshot && record.job) {
    record.jobTitleSnapshot = record.job.title;
  }
  if (!record.locationSnapshot) {
    const locationFromJob = pickJobLocationSnapshot(record.job);
    if (locationFromJob) {
      record.locationSnapshot = locationFromJob;
    }
  }
  await record.save();
  const dto = mapRecordToManagementView(
    record.toObject({ virtuals: true })
  );
  res.status(200).json({ status: 'success', data: dto });
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
