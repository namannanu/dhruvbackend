const AttendanceRecord = require('./attendance.model');
const Job = require('../jobs/job.model');
const Business = require('../businesses/business.model');
const User = require('../users/user.model');
const WorkerProfile = require('../workers/workerProfile.model');
const WorkerEmployment = require('../workers/workerEmployment.model');
const Application = require('../applications/application.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');
const {
  ensureBusinessAccess,
  getAccessibleBusinessIds,
} = require('../../shared/utils/businessAccess');
const {
  buildAttendanceJobLocation,
  buildLocationLabel: sharedBuildLocationLabel
} = require('../../shared/utils/location');
const { resolveOwnershipTag } = require('../../shared/utils/ownershipTag');

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

const pickJobLocationSnapshot = (job, fallbackLocation) => {
  if (fallbackLocation) {
    const directLabel = sharedBuildLocationLabel(fallbackLocation);
    if (directLabel) {
      return directLabel;
    }
    if (fallbackLocation.address) {
      return fallbackLocation.address;
    }
  }

  if (!job || !job.location) {
    return null;
  }
  const { city, state, address } = job.location;
  const cityState = [city, state].filter(Boolean).join(', ');
  if (cityState) {
    return cityState;
  }
  if (address) {
    return address;
  }
  return null;
};

const deriveRecordLocationLabel = (record) => {
  if (record.locationSnapshot) {
    return record.locationSnapshot;
  }
  if (record.jobLocation) {
    const label = sharedBuildLocationLabel(record.jobLocation);
    if (label) {
      return label;
    }
    if (record.jobLocation.address) {
      return record.jobLocation.address;
    }
  }
  const fromJob = pickJobLocationSnapshot(record.job);
  if (fromJob) {
    return fromJob;
  }
  return 'Location TBD';
};

const getRecordBusinessId = (record) => {
  if (!record) {
    return null;
  }
  if (record.business) {
    return toIdString(record.business);
  }
  if (record.job && record.job.business) {
    return toIdString(record.job.business);
  }
  return null;
};

const ensureAttendancePermission = async (req, record, requiredPermissions) => {
  if (req.user.userType !== 'employer') {
    throw new AppError('Only employers can manage attendance records', 403);
  }

  const businessId = getRecordBusinessId(record);
  if (!businessId) {
    throw new AppError('Attendance record is missing business information', 400);
  }

  await ensureBusinessAccess({
    user: req.user,
    businessId,
    requiredPermissions,
  });
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
    location: deriveRecordLocationLabel(record),
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
  const { 
    workerId, 
    workerName,
    businessId, 
    date, 
    startDate,
    endDate,
    status,
    employmentStatus,
    includeEmploymentDetails = 'false'
  } = req.query;

  const filter = {};
  
  // Filter by specific worker ID
  if (workerId) {
    filter.worker = workerId;
  }
  
  // Filter by worker name (partial match)
  if (workerName) {
    const users = await User.find({
      $or: [
        { firstName: { $regex: workerName, $options: 'i' } },
        { lastName: { $regex: workerName, $options: 'i' } },
        { email: { $regex: workerName, $options: 'i' } }
      ]
    }).select('_id');
    const userIds = users.map(u => u._id);
    filter.worker = { $in: userIds };
  }
  
  if (businessId) {
    filter.business = businessId;
  }
  
  // Date filtering
  if (date) {
    const range = buildDayRange(date);
    if (!range) {
      return next(new AppError('Invalid date parameter', 400));
    }
    filter.scheduledStart = { $gte: range.start, $lte: range.end };
  } else if (startDate || endDate) {
    const dateFilter = {};
    if (startDate) {
      const startRange = buildDayRange(startDate);
      if (!startRange) {
        return next(new AppError('Invalid startDate parameter', 400));
      }
      dateFilter.$gte = startRange.start;
    }
    if (endDate) {
      const endRange = buildDayRange(endDate);
      if (!endRange) {
        return next(new AppError('Invalid endDate parameter', 400));
      }
      dateFilter.$lte = endRange.end;
    }
    filter.scheduledStart = dateFilter;
  }
  
  if (status && status !== 'all') {
    filter.status = status;
  }

  // Get attendance records
  const records = await AttendanceRecord.find(filter)
    .populate('worker', 'firstName lastName email phone')
    .populate({
      path: 'job',
      select: 'title description hourlyRate employer business',
      populate: [
        { path: 'employer', select: 'email firstName lastName userType' },
        {
          path: 'business',
          select: 'businessName name logoUrl owner',
          populate: { path: 'owner', select: 'email firstName lastName' }
        }
      ]
    })
    .populate({
      path: 'business',
      select: 'businessName name logoUrl owner',
      populate: { path: 'owner', select: 'email firstName lastName' }
    })
    .populate('employer', 'email firstName lastName userType')
    .sort({ scheduledStart: -1 });

  let enhancedRecords = records;

  // Include employment details if requested
  if (includeEmploymentDetails === 'true') {
    const workerIds = [...new Set(records.map(r => r.worker._id))];
    const employmentRecords = await WorkerEmployment.find({
      worker: { $in: workerIds },
      ...(employmentStatus && { employmentStatus })
    }).populate('employer', 'firstName lastName email');

    // Create a map of worker employment data
    const employmentMap = new Map();
    employmentRecords.forEach(emp => {
      const workerId = emp.worker.toString();
      if (!employmentMap.has(workerId)) {
        employmentMap.set(workerId, []);
      }
      employmentMap.get(workerId).push(emp);
    });

    // Enhance records with employment information
    enhancedRecords = records.map(record => ({
      ...record.toObject(),
      employmentHistory: employmentMap.get(record.worker._id.toString()) || [],
      currentEmployment: employmentMap.get(record.worker._id.toString())?.find(e => e.employmentStatus === 'active') || null
    }));
  }

  const toPlain = (record) =>
    typeof record.toObject === 'function' ? record.toObject({ virtuals: true }) : record;

  const recordsWithTags = enhancedRecords.map((record) => {
    const plain = toPlain(record);
    if (req.user.userType === 'employer') {
      const ownershipTag = resolveOwnershipTag(
        req.user,
        plain.employer,
        plain.job?.employer,
        plain.business?.owner
      );
      if (ownershipTag) {
        plain.createdByTag = ownershipTag;
      }
      if (plain.job && !plain.job.createdByTag) {
        const jobTag = resolveOwnershipTag(
          req.user,
          plain.job.employer,
          plain.job.business?.owner
        );
        if (jobTag) {
          plain.job.createdByTag = jobTag;
        }
      }
    }
    return plain;
  });

  res.status(200).json({ 
    status: 'success', 
    results: recordsWithTags.length, 
    data: recordsWithTags 
  });
});

exports.scheduleAttendance = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Only employers can schedule attendance', 403));
  }
  const job = await Job.findById(req.body.job);
  if (!job) {
    return next(new AppError('Job not found', 404));
  }

  await ensureBusinessAccess({
    user: req.user,
    businessId: job.business,
    requiredPermissions: 'manage_attendance',
  });

  const worker = await User.findById(req.body.worker);
  if (!worker) {
    return next(new AppError('Worker not found', 404));
  }

  const employment = await WorkerEmployment.findOne({
    worker: worker._id,
    job: job._id,
    employmentStatus: 'active'
  });

  const employmentLocationDetails = employment?.workLocationDetails || undefined;
  const employmentLocationLabel = employment?.workLocation || sharedBuildLocationLabel(employmentLocationDetails);
  const jobLocationFromEmployment = employmentLocationDetails
    ? buildAttendanceJobLocation(employmentLocationDetails)
    : null;

  let jobLocationFromJob = null;
  if (job.location && job.location.latitude != null && job.location.longitude != null) {
    jobLocationFromJob = buildAttendanceJobLocation({
      latitude: job.location.latitude,
      longitude: job.location.longitude,
      formattedAddress: sharedBuildLocationLabel({
        formattedAddress: job.location.formattedAddress,
        address: job.location.address,
        city: job.location.city,
        state: job.location.state,
        postalCode: job.location.postalCode,
        label: job.title
      }),
      label: job.title,
      allowedRadius: job.location.allowedRadius
    });
  }

  let jobLocationFromBusiness = null;
  if (!jobLocationFromEmployment && !jobLocationFromJob && job.business) {
    const businessId = job.business._id || job.business;
    const business = await Business.findById(businessId).select('name location');
    if (business?.location && business.location.latitude != null && business.location.longitude != null) {
      jobLocationFromBusiness = buildAttendanceJobLocation({
        latitude: business.location.latitude,
        longitude: business.location.longitude,
        formattedAddress: business.location.formattedAddress,
        label: business.location.name || business.name,
        allowedRadius: business.location.allowedRadius,
      });
    }
  }

  const hourlyRate = typeof req.body.hourlyRate === 'number' ? req.body.hourlyRate : job.hourlyRate;
  const workerNameSnapshot = req.body.workerNameSnapshot || buildWorkerName(worker, null);
  const jobTitleSnapshot = req.body.jobTitleSnapshot || job.title;
  const chosenJobLocation =
    req.body.jobLocation ||
    jobLocationFromEmployment ||
    jobLocationFromJob ||
    jobLocationFromBusiness;
  const locationSnapshot =
    req.body.locationSnapshot ||
    employmentLocationLabel ||
    (chosenJobLocation &&
      sharedBuildLocationLabel({
        formattedAddress: chosenJobLocation.formattedAddress,
        label: chosenJobLocation.label,
        address: chosenJobLocation.address,
      })) ||
    pickJobLocationSnapshot(job, jobLocationFromJob);

  const payload = {
    ...req.body,
    employer: job.employer,
    business: job.business,
    hourlyRate,
    workerNameSnapshot,
    jobTitleSnapshot,
    locationSnapshot
  };

  if (!payload.jobLocation && chosenJobLocation) {
    payload.jobLocation = chosenJobLocation;
  }

  const record = await AttendanceRecord.create(payload);
  await record.populate([
    'worker',
    {
      path: 'job',
      populate: [
        { path: 'employer', select: 'email firstName lastName userType' },
        {
          path: 'business',
          populate: { path: 'owner', select: 'email firstName lastName' }
        }
      ]
    },
    {
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' }
    },
    { path: 'employer', select: 'email firstName lastName userType' }
  ]);
  const recordData = record.toObject({ virtuals: true });
  if (req.user.userType === 'employer') {
    const ownershipTag = resolveOwnershipTag(
      req.user,
      recordData.employer,
      recordData.job?.employer,
      recordData.business?.owner
    );
    if (ownershipTag) {
      recordData.createdByTag = ownershipTag;
    }
  }
  res.status(201).json({ status: 'success', data: recordData });
});

exports.clockIn = catchAsync(async (req, res, next) => {
  console.log('[ATTENDANCE] Clock-in attempt', {
    recordId: req.params.recordId,
    userId: req.user?._id,
    userType: req.user?.userType,
    timestamp: new Date().toISOString()
  });
  const record = await AttendanceRecord.findById(req.params.recordId);
  if (!record) {
    console.warn('[ATTENDANCE] Clock-in failed: record not found', {
      recordId: req.params.recordId
    });
    return next(new AppError('Attendance record not found', 404));
  }
  if (req.user.userType === 'worker' && record.worker.toString() !== req.user._id.toString()) {
    console.warn('[ATTENDANCE] Clock-in denied: worker mismatch', {
      recordId: record._id,
      workerOnRecord: record.worker,
      requester: req.user._id
    });
    return next(new AppError('You can only clock in for your own shift', 403));
  }
  if (record.clockInAt) {
    console.warn('[ATTENDANCE] Clock-in blocked: already clocked in', {
      recordId: record._id,
      clockInAt: record.clockInAt
    });
    return next(new AppError('Already clocked in', 400));
  }

  if (!record.jobLocation) {
    const activeEmployment = await WorkerEmployment.findOne({
      worker: record.worker,
      job: record.job,
      employmentStatus: 'active'
    });
    if (activeEmployment?.workLocationDetails) {
      const jobLocation = buildAttendanceJobLocation(activeEmployment.workLocationDetails);
      if (jobLocation) {
        record.jobLocation = jobLocation;
        record.markModified('jobLocation');
        if (!record.locationSnapshot) {
          const label = activeEmployment.workLocation || sharedBuildLocationLabel(activeEmployment.workLocationDetails);
          if (label) {
            record.locationSnapshot = label;
          }
        }
      }
    }
  }

  if (!record.jobLocation) {
    let jobDetails = record.job;
    if (!jobDetails || typeof jobDetails !== 'object') {
      jobDetails = await Job.findById(record.job).populate('business');
    } else if (!jobDetails.location || !jobDetails.business || !jobDetails.business.location) {
      jobDetails = await Job.findById(jobDetails._id || record.job).populate('business');
    }

    const businessId = jobDetails?.business?._id || jobDetails?.business;
    let business = jobDetails?.business && jobDetails.business.location
      ? jobDetails.business
      : null;
    if (!business && businessId) {
      business = await Business.findById(businessId).select('name location');
    }

    const businessLocation = business?.location;
    if (businessLocation && businessLocation.latitude != null && businessLocation.longitude != null) {
      const jobLocation = buildAttendanceJobLocation({
        latitude: businessLocation.latitude,
        longitude: businessLocation.longitude,
        formattedAddress: businessLocation.formattedAddress,
        label: businessLocation.name || business?.name,
        allowedRadius: businessLocation.allowedRadius,
      });

      if (jobLocation) {
        record.jobLocation = jobLocation;
        record.markModified('jobLocation');
        if (!record.locationSnapshot) {
          record.locationSnapshot = sharedBuildLocationLabel({
            formattedAddress: businessLocation.formattedAddress,
            label: businessLocation.name || business?.name,
            address: businessLocation.line1 || businessLocation.address,
            city: businessLocation.city,
            state: businessLocation.state,
            postalCode: businessLocation.postalCode,
          });
        }
      }
    }
  }

  if (!record.jobLocation) {
    return next(new AppError('This shift is missing a GPS location. Ask the employer to configure a business location before clocking in.', 400));
  }

  // Extract location data from request body
  const { latitude, longitude, accuracy, address, altitude, heading, speed } = req.body;
  console.log('[ATTENDANCE] Clock-in payload', {
    recordId: record._id,
    latitude,
    longitude,
    accuracy,
    address,
    altitude,
    heading,
    speed
  });

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    console.warn('[ATTENDANCE] Clock-in failed: invalid coordinates', {
      recordId: record._id,
      latitude,
      longitude
    });
    return next(new AppError('Valid latitude and longitude are required to clock in', 400));
  }

  // Location validation
  const locationValidation = record.isLocationValid(parsedLatitude, parsedLongitude);
  if (!locationValidation.isValid) {
    console.warn('[ATTENDANCE] Clock-in location invalid', {
      recordId: record._id,
      distance: locationValidation.distance,
      allowedRadius: locationValidation.allowedRadius,
      message: locationValidation.message,
      jobLocation: record.jobLocation
    });
    return next(new AppError(locationValidation.message, 400));
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
    const locationFromJob = pickJobLocationSnapshot(record.job, record.jobLocation);
    if (locationFromJob) {
      record.locationSnapshot = locationFromJob;
    }
  }

  // Store location data
  record.clockInLocation = {
    latitude: parsedLatitude,
    longitude: parsedLongitude,
    accuracy,
    address,
    altitude,
    heading,
    speed,
    timestamp: now
  };
  record.clockInDistance = locationValidation.distance;
  record.locationValidated = locationValidation.isValid;
  record.locationValidationMessage = locationValidation.message;

  await record.save();
  console.log('[ATTENDANCE] Clock-in success', {
    recordId: record._id,
    clockInAt: record.clockInAt,
    distance: record.clockInDistance,
    allowedRadius: record.jobLocation?.allowedRadius
  });
  res.status(200).json({ status: 'success', data: record });
});

exports.clockOut = catchAsync(async (req, res, next) => {
  console.log('[ATTENDANCE] Clock-out attempt', {
    recordId: req.params.recordId,
    userId: req.user?._id,
    userType: req.user?.userType,
    timestamp: new Date().toISOString()
  });
  const record = await AttendanceRecord.findById(req.params.recordId);
  if (!record) {
    console.warn('[ATTENDANCE] Clock-out failed: record not found', {
      recordId: req.params.recordId
    });
    return next(new AppError('Attendance record not found', 404));
  }
  if (req.user.userType === 'worker' && record.worker.toString() !== req.user._id.toString()) {
    console.warn('[ATTENDANCE] Clock-out denied: worker mismatch', {
      recordId: record._id,
      workerOnRecord: record.worker,
      requester: req.user._id
    });
    return next(new AppError('You can only clock out for your own shift', 403));
  }
  if (!record.clockInAt) {
    console.warn('[ATTENDANCE] Clock-out blocked: no clock-in recorded', {
      recordId: record._id
    });
    return next(new AppError('Clock in before clocking out', 400));
  }
  if (record.clockOutAt) {
    console.warn('[ATTENDANCE] Clock-out blocked: already clocked out', {
      recordId: record._id,
      clockOutAt: record.clockOutAt
    });
    return next(new AppError('Already clocked out', 400));
  }

  if (!record.jobLocation) {
    const activeEmployment = await WorkerEmployment.findOne({
      worker: record.worker,
      job: record.job,
      employmentStatus: 'active'
    });
    if (activeEmployment?.workLocationDetails) {
      const jobLocation = buildAttendanceJobLocation(activeEmployment.workLocationDetails);
      if (jobLocation) {
        record.jobLocation = jobLocation;
        if (!record.locationSnapshot) {
          const label = activeEmployment.workLocation || sharedBuildLocationLabel(activeEmployment.workLocationDetails);
          if (label) {
            record.locationSnapshot = label;
          }
        }
      }
    }
  }

  if (!record.jobLocation) {
    let jobDetails = record.job;
    if (!jobDetails || typeof jobDetails !== 'object') {
      jobDetails = await Job.findById(record.job).populate('business');
    } else if (!jobDetails.location || !jobDetails.business || !jobDetails.business.location) {
      jobDetails = await Job.findById(jobDetails._id || record.job).populate('business');
    }

    const businessId = jobDetails?.business?._id || jobDetails?.business;
    let business = jobDetails?.business && jobDetails.business.location ? jobDetails.business : null;
    if (!business && businessId) {
      business = await Business.findById(businessId).select('name location');
    }

    const businessLocation = business?.location;
    if (businessLocation && businessLocation.latitude != null && businessLocation.longitude != null) {
      const jobLocation = buildAttendanceJobLocation({
        latitude: businessLocation.latitude,
        longitude: businessLocation.longitude,
        formattedAddress: businessLocation.formattedAddress,
        label: businessLocation.name || business?.name,
        allowedRadius: businessLocation.allowedRadius,
      });

      if (jobLocation) {
        record.jobLocation = jobLocation;
        record.markModified('jobLocation');
        if (!record.locationSnapshot) {
          record.locationSnapshot = sharedBuildLocationLabel({
            formattedAddress: businessLocation.formattedAddress,
            label: businessLocation.name || business?.name,
            address: businessLocation.line1 || businessLocation.address,
            city: businessLocation.city,
            state: businessLocation.state,
            postalCode: businessLocation.postalCode,
          });
        }
      }
    }
  }

  if (!record.jobLocation) {
    return next(new AppError('This shift is missing a GPS location. Ask the employer to configure a business location before clocking out.', 400));
  }

  // Extract location data from request body
  const { latitude, longitude, accuracy, address, altitude, heading, speed } = req.body;

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return next(new AppError('Valid latitude and longitude are required to clock out', 400));
  }

  // Location validation for clock-out
  const locationValidation = record.isLocationValid(parsedLatitude, parsedLongitude);
  if (!locationValidation.isValid) {
    console.warn('[ATTENDANCE] Clock-out location invalid', {
      recordId: record._id,
      distance: locationValidation.distance,
      allowedRadius: locationValidation.allowedRadius,
      message: locationValidation.message,
      jobLocation: record.jobLocation
    });
    return next(new AppError(locationValidation.message, 400));
  }

  await record.populate([
    { path: 'job', select: 'hourlyRate location title' },
    { path: 'worker', select: 'firstName lastName email' }
  ]);
  
  const now = new Date();
  record.clockOutAt = now;
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
    const locationFromJob = pickJobLocationSnapshot(record.job, record.jobLocation);
    if (locationFromJob) {
      record.locationSnapshot = locationFromJob;
    }
  }

  // Store clock-out location data
  record.clockOutLocation = {
    latitude: parsedLatitude,
    longitude: parsedLongitude,
    accuracy,
    address,
    altitude,
    heading,
    speed,
    timestamp: now
  };
  record.clockOutDistance = locationValidation.distance;
  
  // Update overall location validation status
  if (record.locationValidated !== false) { // Don't override if already failed
    record.locationValidated = locationValidation.isValid;
    record.locationValidationMessage = locationValidation.message;
  }

  await record.save();
  console.log('[ATTENDANCE] Clock-out success', {
    recordId: record._id,
    clockOutAt: record.clockOutAt,
    distance: record.clockOutDistance,
    allowedRadius: record.jobLocation?.allowedRadius,
    durationHours: record.totalHours,
    hourlyRate: record.hourlyRate,
    earnings: record.earnings
  });
  res.status(200).json({ status: 'success', data: record });
});

exports.getManagementView = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Only employers can access attendance management', 403));
  }
  if (!req.query.date) {
    return next(new AppError('The date query parameter is required', 400));
  }
  const { businessId } = req.query;
  const range = buildDayRange(req.query.date);
  if (!range) {
    return next(new AppError('Invalid date parameter', 400));
  }
  const filter = {
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

  if (req.user.userType === 'employer') {
    const accessibleBusinesses = await getAccessibleBusinessIds(req.user);

    if (!accessibleBusinesses.size) {
      return res.status(200).json({ status: 'success', data: [], results: 0 });
    }

    if (businessId && !accessibleBusinesses.has(businessId)) {
      return res.status(200).json({ status: 'success', data: [], results: 0 });
    }

    if (!filter.business) {
      filter.business = { $in: Array.from(accessibleBusinesses) };
    }
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
  await ensureAttendancePermission(req, record, 'manage_attendance');
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
    const locationFromJob = pickJobLocationSnapshot(record.job, record.jobLocation);
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
  await ensureAttendancePermission(req, record, 'manage_attendance');
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
    const locationFromJob = pickJobLocationSnapshot(record.job, record.jobLocation);
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
  await ensureAttendancePermission(req, record, 'manage_attendance');
  Object.assign(record, req.body);
  await record.save();
  res.status(200).json({ status: 'success', data: record });
});

// Search workers by name and see their employment dates and schedules
exports.searchWorkersByName = catchAsync(async (req, res, next) => {
  const { name, includeSchedule = 'true' } = req.query;
  
  if (!name) {
    return next(new AppError('Worker name is required for search', 400));
  }

  // Find workers matching the name
  const workers = await User.find({
    userType: 'worker',
    $or: [
      { firstName: { $regex: name, $options: 'i' } },
      { lastName: { $regex: name, $options: 'i' } },
      { email: { $regex: name, $options: 'i' } }
    ]
  }).select('firstName lastName email phone');

  if (workers.length === 0) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: [],
      message: 'No workers found matching the search criteria'
    });
  }

  const workerIds = workers.map(w => w._id);
  
  // Get employment history for these workers
  const employmentRecords = await WorkerEmployment.find({
    worker: { $in: workerIds }
  })
    .populate('employer', 'firstName lastName email')
    .populate('business', 'name address logoUrl')
    .populate('job', 'title description hourlyRate startDate endDate')
    .sort({ hireDate: -1 });

  // Get attendance/schedule data if requested
  let scheduleData = [];
  if (includeSchedule === 'true') {
    scheduleData = await AttendanceRecord.find({
      worker: { $in: workerIds }
    })
      .populate('job', 'title hourlyRate')
      .populate('business', 'name logoUrl')
      .sort({ scheduledStart: -1 })
      .limit(50); // Limit to recent 50 records per worker
  }

  // Organize data by worker
  const workerData = workers.map(worker => {
    const workerEmployment = employmentRecords.filter(
      emp => emp.worker.toString() === worker._id.toString()
    );
    
    const workerSchedule = scheduleData.filter(
      schedule => schedule.worker.toString() === worker._id.toString()
    );

    return {
      worker: {
        id: worker._id,
        name: `${worker.firstName} ${worker.lastName}`.trim(),
        email: worker.email,
        phone: worker.phone
      },
      employmentHistory: workerEmployment.map(emp => ({
        employmentId: emp._id,
        employer: emp.employer,
        business: emp.business,
        position: emp.position,
        hireDate: emp.hireDate,
        endDate: emp.endDate,
        employmentStatus: emp.employmentStatus,
        hourlyRate: emp.hourlyRate,
        jobDetails: emp.job
      })),
      currentEmployment: workerEmployment.find(emp => emp.employmentStatus === 'active'),
      recentSchedule: includeSchedule === 'true' ? workerSchedule.slice(0, 10) : [],
      totalEmployments: workerEmployment.length,
      totalScheduledShifts: workerSchedule.length
    };
  });

  res.status(200).json({
    status: 'success',
    results: workerData.length,
    data: workerData
  });
});

// Get employment timeline for a specific worker
exports.getWorkerEmploymentTimeline = catchAsync(async (req, res, next) => {
  const { workerId } = req.params;
  const { startDate, endDate } = req.query;

  // Verify worker exists
  const worker = await User.findById(workerId).select('firstName lastName email');
  if (!worker) {
    return next(new AppError('Worker not found', 404));
  }

  // Get employment history
  const employmentFilter = { worker: workerId };
  const employmentRecords = await WorkerEmployment.find(employmentFilter)
    .populate('employer', 'firstName lastName email')
    .populate('business', 'name address logoUrl contactInfo')
    .populate('job', 'title description hourlyRate startDate endDate workDays workingHours')
    .sort({ hireDate: -1 });

  // Get attendance records within date range if specified
  const attendanceFilter = { worker: workerId };
  if (startDate || endDate) {
    const dateFilter = {};
    if (startDate) {
      const start = buildDayRange(startDate);
      if (!start) {
        return next(new AppError('Invalid startDate parameter', 400));
      }
      dateFilter.$gte = start.start;
    }
    if (endDate) {
      const end = buildDayRange(endDate);
      if (!end) {
        return next(new AppError('Invalid endDate parameter', 400));
      }
      dateFilter.$lte = end.end;
    }
    attendanceFilter.scheduledStart = dateFilter;
  }

  const attendanceRecords = await AttendanceRecord.find(attendanceFilter)
    .populate('job', 'title hourlyRate')
    .populate('business', 'name logoUrl')
    .sort({ scheduledStart: -1 });

  // Create timeline data
  const timeline = {
    worker: {
      id: worker._id,
      name: `${worker.firstName} ${worker.lastName}`.trim(),
      email: worker.email
    },
    employmentHistory: employmentRecords.map(emp => ({
      employmentId: emp._id,
      employer: emp.employer,
      business: emp.business,
      position: emp.position,
      hireDate: emp.hireDate,
      endDate: emp.endDate,
      employmentStatus: emp.employmentStatus,
      hourlyRate: emp.hourlyRate,
      workLocation: emp.workLocation,
      workLocationDetails: emp.workLocationDetails,
      jobDetails: emp.job,
      employmentDuration: emp.employmentDuration
    })),
    attendanceRecords: attendanceRecords.map(record => ({
      id: record._id,
      date: toDateString(record.scheduledStart),
      scheduledStart: toTimeString(record.scheduledStart),
      scheduledEnd: toTimeString(record.scheduledEnd),
      clockIn: toTimeString(record.clockIn),
      clockOut: toTimeString(record.clockOut),
      status: record.status,
      hoursWorked: record.hoursWorked,
      earnings: record.earnings,
      job: record.job,
      business: record.business
    })),
    summary: {
      totalEmployments: employmentRecords.length,
      activeEmployments: employmentRecords.filter(emp => emp.employmentStatus === 'active').length,
      totalAttendanceRecords: attendanceRecords.length,
      totalHoursWorked: attendanceRecords.reduce((sum, record) => sum + (record.hoursWorked || 0), 0),
      totalEarnings: attendanceRecords.reduce((sum, record) => sum + (record.earnings || 0), 0)
    }
  };

  res.status(200).json({
    status: 'success',
    data: timeline
  });
});

// Get all workers employed on a specific date
exports.getWorkersEmployedOnDate = catchAsync(async (req, res, next) => {
  const { date } = req.params;
  const { includeSchedule = 'false' } = req.query;

  if (!date) {
    return next(new AppError('Date parameter is required', 400));
  }

  const targetDate = new Date(date);
  if (Number.isNaN(targetDate.valueOf())) {
    return next(new AppError('Invalid date format. Use YYYY-MM-DD', 400));
  }

  // Find employment records that were active on the target date
  const employmentRecords = await WorkerEmployment.find({
    hireDate: { $lte: targetDate },
    $or: [
      { endDate: null }, // Still active
      { endDate: { $gte: targetDate } } // Ended after target date
    ]
  })
    .populate('worker', 'firstName lastName email phone')
    .populate('employer', 'firstName lastName email')
    .populate('business', 'name address logoUrl')
    .populate('job', 'title description hourlyRate');

  let workersData = employmentRecords.map(emp => ({
    worker: emp.worker,
    employer: emp.employer,
    business: emp.business,
    employment: {
      employmentId: emp._id,
      position: emp.position,
      hireDate: emp.hireDate,
      endDate: emp.endDate,
      employmentStatus: emp.employmentStatus,
      hourlyRate: emp.hourlyRate,
      daysEmployed: Math.ceil((targetDate - emp.hireDate) / (1000 * 60 * 60 * 24))
    },
    jobDetails: emp.job
  }));

  // Include schedule information for that specific date if requested
  if (includeSchedule === 'true') {
    const dateRange = buildDayRange(date);
    const workerIds = employmentRecords.map(emp => emp.worker._id);
    
    const scheduleRecords = await AttendanceRecord.find({
      worker: { $in: workerIds },
      scheduledStart: { $gte: dateRange.start, $lte: dateRange.end }
    }).populate('job', 'title').populate('business', 'name logoUrl');

    // Add schedule info to each worker
    workersData = workersData.map(workerData => ({
      ...workerData,
      scheduleForDate: scheduleRecords.filter(
        schedule => schedule.worker.toString() === workerData.worker._id.toString()
      )
    }));
  }

  res.status(200).json({
    status: 'success',
    date: toDateString(targetDate),
    results: workersData.length,
    data: workersData
  });
});

// Get all attendance records by userId (for both worker and employer)
exports.getAttendanceByUserId = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate, status } = req.query;
  
  if (!userId) {
    return res.status(400).json({
      status: 'error',
      message: 'UserId parameter is required'
    });
  }

  // Find user by userId
  const user = await User.findOne({ userId }).select('_id firstName lastName email userType');
  
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found with the provided id'
    });
  }

  // Build query filter
  const filter = {
    $or: [
      { worker: user._id },
      { employer: user._id }
    ]
  };

  // Add date range filter if provided
  if (startDate || endDate) {
    filter.scheduledStart = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filter.scheduledStart.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.scheduledStart.$lte = end;
    }
  }

  // Add status filter if provided
  if (status) {
    filter.status = status;
  }

  // Find all attendance records
  const attendanceRecords = await AttendanceRecord.find(filter)
    .populate('worker', 'userId firstName lastName email')
    .populate('employer', 'userId firstName lastName email')
    .populate('job', 'title description hourlyRate')
    .populate('business', 'name address logoUrl')
    .sort({ scheduledStart: -1 });

  // Categorize attendance records
  const categorizedAttendance = {
    workerAttendance: attendanceRecords.filter(record => 
      record.worker._id.toString() === user._id.toString()
    ),
    employerAttendance: attendanceRecords.filter(record => 
      record.employer && record.employer._id.toString() === user._id.toString()
    )
  };

  // Calculate summary statistics
  const workerStats = {
    totalHours: categorizedAttendance.workerAttendance.reduce((sum, record) => sum + (record.totalHours || 0), 0),
    totalEarnings: categorizedAttendance.workerAttendance.reduce((sum, record) => sum + (record.earnings || 0), 0),
    completedShifts: categorizedAttendance.workerAttendance.filter(record => record.status === 'completed').length,
    missedShifts: categorizedAttendance.workerAttendance.filter(record => record.status === 'missed').length
  };

  const employerStats = {
    totalShiftsManaged: categorizedAttendance.employerAttendance.length,
    completedShifts: categorizedAttendance.employerAttendance.filter(record => record.status === 'completed').length,
    totalPayouts: categorizedAttendance.employerAttendance.reduce((sum, record) => sum + (record.earnings || 0), 0)
  };

  res.status(200).json({
    status: 'success',
    results: attendanceRecords.length,
    data: {
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        userType: user.userType
      },
      attendance: categorizedAttendance,
      summary: {
        totalRecords: attendanceRecords.length,
        workerRecords: categorizedAttendance.workerAttendance.length,
        employerRecords: categorizedAttendance.employerAttendance.length,
        workerStats,
        employerStats
      },
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        status: status || null
      }
    }
  });
});
