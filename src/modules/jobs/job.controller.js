// job.controller.js
const mongoose = require('mongoose');
const Job = require('./job.model');
const Application = require('../applications/application.model');
const Business = require('../businesses/business.model');
const User = require('../users/user.model');

const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');
const { haversine } = require('../../shared/utils/distance');
const {
  DEFAULT_ALLOWED_RADIUS_METERS,
  buildLocationLabel,
} = require('../../shared/utils/location');
const {
  ensureBusinessAccess,
  getAccessibleBusinessIds,
} = require('../../shared/utils/businessAccess');
const { resolveOwnershipTag } = require('../../shared/utils/ownershipTag');

// If you keep free/premium logic:
const JOB_FREE_QUOTA = 2;

const JOB_PUBLISH_STATUS = Object.freeze({
  PAYMENT_REQUIRED: 'payment_required',
  READY_TO_PUBLISH: 'ready_to_publish',
  PUBLISHED: 'published',
});

const BUSINESS_RESPONSE_FIELDS = 'businessName name logoUrl logo location address line1 city state postalCode country latitude longitude allowedRadius';

const parsePublishToggle = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(v)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(v)) return false;
  }
  return undefined;
};

const normalizeLogoUrl = (b) =>
  b?.logo?.square?.url || b?.logo?.original?.url || b?.logoUrl || null;

// Make a predictable job DTO for clients (worker/employer)
const buildJobResponse = async (job, currentUser) => {
  const j = job.toObject({ virtuals: true });

  // Flatten employer
  if (j.employer && typeof j.employer === 'object' && j.employer._id) {
    j.employerId = j.employer._id.toString();
    j.employerDetails = j.employer;
    if (!currentUser || currentUser.userType !== 'employer') {
      j.employer = j.employerId;
    }
  }

  // Flatten createdBy
  if (j.createdBy && typeof j.createdBy === 'object' && j.createdBy._id) {
    j.createdById = j.createdBy._id.toString();
    j.createdByDetails = j.createdBy;
    if (!currentUser || currentUser.userType !== 'employer') {
      j.createdBy = j.createdById;
    }
  } else if (j.createdBy) {
    j.createdById = j.createdBy.toString();
  } else {
    j.createdById = null;
  }

  // Flatten business
  if (j.business && typeof j.business === 'object' && j.business._id) {
    j.businessId = j.business._id.toString();
    j.businessDetails = j.business;
    j.businessName = j.business.businessName || j.business.name || j.businessName || null;
    j.businessLogoUrl = normalizeLogoUrl(j.business);

    // Enhanced location handling
    if (!j.location && j.business.location) {
      j.location = {
        line1: j.business.location.line1,
        address: j.business.location.address,
        city: j.business.location.city,
        state: j.business.location.state,
        postalCode: j.business.location.postalCode,
        country: j.business.location.country,
        latitude: j.business.location.latitude,
        longitude: j.business.location.longitude,
        allowedRadius: j.business.location.allowedRadius
      };
    }

    if (!currentUser || currentUser.userType !== 'employer') {
      j.business = j.businessId;
    }
  } else if (j.businessId && typeof j.businessId === 'object' && j.businessId._id) {
    j.businessDetails = j.businessId;
    j.businessId = j.businessId._id.toString();
    j.businessName = j.businessDetails.businessName || j.businessDetails.name || j.businessName || null;
    j.businessLogoUrl = normalizeLogoUrl(j.businessDetails);

    // Enhanced location handling for populated businessId
    if (!j.location && j.businessDetails.location) {
      j.location = {
        line1: j.businessDetails.location.line1,
        address: j.businessDetails.location.address,
        city: j.businessDetails.location.city,
        state: j.businessDetails.location.state,
        postalCode: j.businessDetails.location.postalCode,
        country: j.businessDetails.location.country,
        latitude: j.businessDetails.location.latitude,
        longitude: j.businessDetails.location.longitude,
        allowedRadius: j.businessDetails.location.allowedRadius
      };
    }
  }

  // publishedBy
  if (j.publishedBy && typeof j.publishedBy === 'object' && j.publishedBy._id) {
    j.publishedByDetails = j.publishedBy;
    j.publishedBy = j.publishedBy._id.toString();
  } else if (j.publishedBy) {
    j.publishedBy = j.publishedBy.toString();
  }

  // computed publish flags
  const requiresPaymentForEmployer = Boolean(j.premiumRequired);
  const isPublished = Boolean(j.isPublished);
  j.isPublished = isPublished;
  j.publishStatus = isPublished
    ? JOB_PUBLISH_STATUS.PUBLISHED
    : requiresPaymentForEmployer
    ? JOB_PUBLISH_STATUS.PAYMENT_REQUIRED
    : JOB_PUBLISH_STATUS.READY_TO_PUBLISH;
  j.publishActionRequired = j.publishStatus === JOB_PUBLISH_STATUS.READY_TO_PUBLISH && j.status === 'active';

  // worker-specific flags
  if (currentUser?.userType === 'worker') {
    const hasApplied = await Application.exists({ job: job._id, worker: currentUser._id });
    j.hasApplied = Boolean(hasApplied);
    j.premiumRequired = !currentUser.premium && currentUser.freeApplicationsUsed >= 3;
  }

  // employer ownership tag
  if (currentUser?.userType === 'employer') {
    const tag = resolveOwnershipTag(currentUser, j.employer, j.businessDetails?.owner);
    if (tag) j.createdByTag = tag;
  }

  return j;
};

/**
 * WORKER: List available jobs (optionally near lat/lng within radius meters)
 * Query params: ?lat=..&lng=..&radius=..(meters)
 */
exports.listJobsForWorker = catchAsync(async (req, res) => {
  const filter = {
    status: 'active',
    isPublished: true,
    employer: { $ne: req.user._id }, // don’t show my own postings
  };

  const lat = req.query.lat != null ? parseFloat(req.query.lat) : NaN;
  const lng = req.query.lng != null ? parseFloat(req.query.lng) : NaN;
  const rQuery = req.query.radius != null ? parseFloat(req.query.radius) : NaN;

  const hasLocation = !Number.isNaN(lat) && !Number.isNaN(lng);
  const maxMeters = Number.isNaN(rQuery) ? DEFAULT_ALLOWED_RADIUS_METERS : Math.max(rQuery, 0);

  const jobs = await Job.find(filter)
    .populate('business', BUSINESS_RESPONSE_FIELDS)
    .populate('employer', 'firstName lastName email')
    .sort({ createdAt: -1 });

  const out = [];
  for (const job of jobs) {
    let distanceKm = null;

    if (hasLocation) {
      const coords = job.location || job.business?.location;
      if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
        continue; // cannot compute distance, skip if location filtering
      }
      distanceKm = haversine({
        lat1: lat,
        lon1: lng,
        lat2: coords.latitude,
        lon2: coords.longitude,
      });
      if (distanceKm == null || Number.isNaN(distanceKm) || distanceKm * 1000 > maxMeters) {
        continue;
      }
    }

    const dto = await buildJobResponse(job, req.user);
    if (hasLocation && typeof distanceKm === 'number') dto.distance = distanceKm;
    out.push(dto);
  }

  if (hasLocation) {
    out.sort((a, b) => {
      if (a.distance == null && b.distance == null) return 0;
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });
  }

  res.status(200).json({ status: 'success', results: out.length, data: out });
});

/**
 * EMPLOYER: List my jobs (for businesses I can access)
 * Optional: ?businessId=...
 */
exports.listJobsForEmployer = catchAsync(async (req, res, next) => {
  const accessible = await getAccessibleBusinessIds(req.user);
  if (!accessible?.size) {
    return res.status(200).json({ status: 'success', results: 0, data: [] });
  }

  const filter = { business: { $in: Array.from(accessible) } };
  if (req.query.businessId) {
    if (!accessible.has(req.query.businessId)) {
      return next(new AppError('You do not have access to this business', 403));
    }
    filter.business = req.query.businessId;
  }

  const jobs = await Job.find(filter)
    .populate('business', BUSINESS_RESPONSE_FIELDS)
    .populate('employer', 'firstName lastName email')
    .sort({ createdAt: -1 });

  const out = await Promise.all(jobs.map((j) => buildJobResponse(j, req.user)));
  res.status(200).json({ status: 'success', results: out.length, data: out });
});

/**
 * GET one job by id (workers can only see published unless they own it)
 */
exports.getJob = catchAsync(async (req, res, next) => {
  const businessPopulateForDetail =
    req.user.userType === 'employer'
      ? {
          path: 'business',
          select: `${BUSINESS_RESPONSE_FIELDS} owner`,
          populate: { path: 'owner', select: 'email firstName lastName' },
        }
      : { path: 'business', select: BUSINESS_RESPONSE_FIELDS };

  let q = Job.findById(req.params.jobId).populate(businessPopulateForDetail);
  if (req.user.userType === 'employer') {
    q = q
      .populate('employer', 'email firstName lastName userType')
      .populate('createdBy', 'email firstName lastName userType')
      .populate('publishedBy', 'email firstName lastName userType');
  }
  const job = await q;

  if (!job) return next(new AppError('Job not found', 404));
  if (req.user.userType === 'worker' && !job.isPublished && job.employer?.toString() !== req.user._id.toString()) {
    return next(new AppError('Job not found', 404));
  }

  const dto = await buildJobResponse(job, req.user);
  res.status(200).json({ status: 'success', data: dto });
});

/**
 * CREATE a job (employer only)
 * Body must include: business or businessId, title, description, hourlyRate
 * Optional: schedule, location (autofills from business if omitted), tags, urgency, verificationRequired, overtime
 */
exports.createJob = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') return next(new AppError('Only employers can create jobs', 403));

  const businessId = req.body.business || req.body.businessId;
  if (!businessId) return next(new AppError('Business must be specified (business or businessId)', 400));

  // Validate that location is provided in the request
  if (!req.body.location) {
    return next(new AppError('Location is required for job posting', 400));
  }

  // Validate required location fields
  const requiredLocationFields = ['latitude', 'longitude'];
  const missingFields = requiredLocationFields.filter(field => !req.body.location[field]);
  if (missingFields.length > 0) {
    return next(new AppError(`Missing required location fields: ${missingFields.join(', ')}`, 400));
  }

  const { business } = await ensureBusinessAccess({
    user: req.user,
    businessId,
  });

  // free/premium rule is measured on the business owner
  const ownerUser = await User.findById(business.owner).lean();
  if (!ownerUser) return next(new AppError('Business owner not found', 400));

  const freeJobsUsed = Number(ownerUser.freeJobsPosted || 0);
  const requiresPayment = !ownerUser.premium && freeJobsUsed >= JOB_FREE_QUOTA;
  const shouldAutoPublish = !requiresPayment;

  // sanitize payload
  const jobData = { ...req.body };
  delete jobData.businessId;
  delete jobData.status;
  delete jobData.isPublished;
  delete jobData.publishedAt;
  delete jobData.publishedBy;
  delete jobData.publish;
  delete jobData.publishAfterPayment;
  delete jobData.publishStatus;
  delete jobData.publishActionRequired;
  delete jobData.premiumRequired;
  delete jobData.businessAddress;

  // Ensure location is properly set
  if (!jobData.location) {
    // If no location provided, copy from business
    if (!business.location) {
      return next(new AppError('Business location is required. Please set business location first.', 400));
    }

    jobData.location = {
      line1: business.location.line1,
      address: business.location.address || business.location.line1,
      city: business.location.city,
      state: business.location.state,
      postalCode: business.location.postalCode,
      country: business.location.country,
      latitude: business.location.latitude,
      longitude: business.location.longitude,
      formattedAddress: [
        business.location.line1,
        business.location.city,
        business.location.state,
        business.location.postalCode,
        business.location.country
      ].filter(Boolean).join(', '),
      allowedRadius: business.location.allowedRadius || 150
    };
  } else {
    // If location provided, ensure all required fields are present
    const requiredFields = ['line1', 'city', 'state', 'postalCode', 'country', 'latitude', 'longitude'];
    const missingFields = requiredFields.filter(field => !jobData.location[field]);
    
    if (missingFields.length > 0) {
      return next(new AppError(`Missing required location fields: ${missingFields.join(', ')}`, 400));
    }

    // Ensure formattedAddress is set
    if (!jobData.location.formattedAddress) {
      jobData.location.formattedAddress = [
        jobData.location.line1,
        jobData.location.city,
        jobData.location.state,
        jobData.location.postalCode,
        jobData.location.country
      ].filter(Boolean).join(', ');
    }

    // Ensure address field matches line1 if not provided
    if (!jobData.location.address) {
      jobData.location.address = jobData.location.line1;
    }
  }

  const initialStatus = shouldAutoPublish ? 'active' : 'draft';

  // Create a new Job instance first to trigger validation
  const job = new Job({
    ...jobData,
    employer: business.owner,
    createdBy: req.user._id,
    business: business._id,
    premiumRequired: requiresPayment,
    status: initialStatus,
    isPublished: shouldAutoPublish,
    publishedAt: shouldAutoPublish ? new Date() : null,
    publishedBy: shouldAutoPublish ? req.user._id : null,
  });

  try {
    // This will trigger the pre-validate hook
    await job.validate();
  } catch (err) {
    return next(new AppError(err.message, 400));
  }

  // If validation passes, save the job
  await job.save();

  await job.populate([
    {
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' },
      select: BUSINESS_RESPONSE_FIELDS + ' owner',
    },
    { path: 'employer', select: 'email firstName lastName userType' },
    { path: 'createdBy', select: 'email firstName lastName userType' },
    { path: 'publishedBy', select: 'email firstName lastName userType' },
  ]);

  const dto = await buildJobResponse(job, req.user);
  res.status(201).json({ status: 'success', data: dto });
});

/**
 * UPDATE a job (employer + team with edit_jobs on the job’s business)
 * Supports publish toggle via any of: publish | isPublished | publishAfterPayment
 */
exports.updateJob = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.jobId).populate({
    path: 'business',
    populate: { path: 'owner', select: 'email firstName lastName' },
  });

  if (!job) return next(new AppError('Job not found', 404));

  await ensureBusinessAccess({
    user: req.user,
    businessId: job.business,
    requiredPermissions: 'edit_jobs',
  });

  const payload = { ...req.body };
  delete payload.createdBy;

  // publish toggle
  const key = ['publish', 'isPublished', 'publishAfterPayment'].find((k) =>
    Object.prototype.hasOwnProperty.call(payload, k)
  );
  const requestedPublish = key !== undefined ? parsePublishToggle(payload[key]) : undefined;

  // remove server-managed fields
  delete payload.publish;
  delete payload.isPublished;
  delete payload.publishAfterPayment;
  delete payload.published;
  delete payload.publishedAt;
  delete payload.publishedBy;
  delete payload.publishStatus;
  delete payload.publishActionRequired;
  delete payload.businessAddress;

  Object.assign(job, payload);

  if (requestedPublish !== undefined) {
    if (requestedPublish) {
      if (job.premiumRequired) return next(new AppError('Complete payment before publishing this job', 402));
      if (job.status !== 'active') return next(new AppError('Only active jobs can be published', 400));
      job.isPublished = true;
      job.publishedAt = new Date();
      job.publishedBy = req.user._id;
    } else if (job.isPublished) {
      job.isPublished = false;
      job.publishedAt = null;
      job.publishedBy = null;
    }
  }

  await job.save();

  await job.populate([
    {
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' },
      select: BUSINESS_RESPONSE_FIELDS + ' owner',
    },
    { path: 'employer', select: 'email firstName lastName userType' },
    { path: 'createdBy', select: 'email firstName lastName userType' },
    { path: 'publishedBy', select: 'email firstName lastName userType' },
  ]);

  const dto = await buildJobResponse(job, req.user);
  res.status(200).json({ status: 'success', data: dto });
});

/**
 * HIRE an applicant for a job (employers and team members with hire_workers)
 */
exports.hireApplicant = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Only employers can hire applicants', 403));
  }

  const { applicationId } = req.params;
  if (!applicationId) {
    return next(new AppError('Application ID is required', 400));
  }

  const application = await Application.findById(applicationId);
  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  const job = await Job.findById(application.job).populate('business');
  if (!job) {
    return next(new AppError('Job not found for this application', 404));
  }

  const jobBusinessId = job.business ? job.business._id.toString() : null;
  const requestedBusinessId = req.body.businessId ? req.body.businessId.toString() : null;

  if (requestedBusinessId && jobBusinessId && requestedBusinessId !== jobBusinessId) {
    return next(new AppError('Job does not belong to the specified business', 400));
  }

  const businessToCheck = requestedBusinessId || jobBusinessId;
  if (businessToCheck) {
    await ensureBusinessAccess({
      user: req.user,
      businessId: businessToCheck,
      requiredPermissions: 'hire_workers',
    });
  } else if (job.employer?.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have access to this job', 403));
  }

  if (!application.worker) {
    return next(new AppError('Application worker missing', 400));
  }

  const jobHiredWorkerId = job.hiredWorker ? job.hiredWorker.toString() : null;
  const applicationWorkerId = application.worker.toString();

  if (jobHiredWorkerId && jobHiredWorkerId !== applicationWorkerId) {
    return next(new AppError('Job already has a hired worker', 400));
  }

  if (application.status === 'withdrawn') {
    return next(new AppError('Cannot hire an application that has been withdrawn', 400));
  }

  let startDate = null;
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'startDate')) {
    const parsed = new Date(req.body.startDate);
    if (Number.isNaN(parsed.valueOf())) {
      return next(new AppError('Invalid startDate', 400));
    }
    startDate = parsed;
  }

  if (typeof req.body?.hiringNotes === 'string') {
    application.hiringNotes = req.body.hiringNotes.trim();
  } else if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'hiringNotes')) {
    application.hiringNotes = undefined;
  }

  const now = new Date();
  application.status = 'hired';
  application.hiredAt = now;
  application.rejectedAt = undefined;
  application.withdrawnAt = undefined;

  job.hiredWorker = application.worker;
  job.status = 'filled';

  if (startDate) {
    job.set('schedule.startDate', startDate);
    if (!job.schedule || !job.schedule.endDate) {
      job.set('schedule.endDate', startDate);
    }
  }

  await Promise.all([application.save(), job.save()]);

  const responseApplication = await Application.findById(application._id)
    .populate({
      path: 'job',
      select: 'title status business schedule location hourlyRate hiredWorker employer',
      populate: [
        { path: 'business', select: 'name businessName owner' },
        { path: 'hiredWorker', select: 'firstName lastName email phone userType' },
        { path: 'employer', select: 'firstName lastName email phone userType' },
      ],
    })
    .populate({
      path: 'worker',
      select: 'firstName lastName email phone userType',
    });

  res.status(200).json({ status: 'success', data: responseApplication });
});
