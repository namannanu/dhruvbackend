const Job = require('./job.model');
const Application = require('../applications/application.model');
const Business = require('../businesses/business.model');
const User = require('../users/user.model');
const EmployerProfile = require('../employers/employerProfile.model');
const WorkerProfile = require('../workers/workerProfile.model');
const WorkerEmployment = require('../workers/workerEmployment.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const { haversine } = require('../../shared/utils/distance');
const {
  DEFAULT_ALLOWED_RADIUS_METERS,
  buildLocationLabel
} = require('../../shared/utils/location');
const {
  ensureBusinessAccess,
  getAccessibleBusinessIds,
} = require('../../shared/utils/businessAccess');
const { resolveOwnershipTag } = require('../../shared/utils/ownershipTag');

const JOB_FREE_QUOTA = 20000;///////               change to 2

const buildJobResponse = async (job, currentUser) => {
  const jobObj = job.toObject();
  if (currentUser && currentUser.userType === 'worker') {
    const hasApplied = await Application.exists({ job: job._id, worker: currentUser._id });
    jobObj.hasApplied = Boolean(hasApplied);
    jobObj.premiumRequired =
      !currentUser.premium && currentUser.freeApplicationsUsed >= 3;
  }

  if (currentUser && currentUser.userType === 'employer') {
    const ownershipTag = resolveOwnershipTag(
      currentUser,
      jobObj.employer,
      jobObj.business?.owner
    );
    if (ownershipTag) {
      jobObj.createdByTag = ownershipTag;
    }
  }

  return jobObj;
};

exports.listJobs = catchAsync(async (req, res) => {
  const filter = {};
  let accessContext = {
    userType: req.user.userType,
    userId: req.user._id,
    userEmail: req.user.email,
    accessibleBusinesses: [],
    accessSource: 'unknown',
    jobsFrom: 'all_accessible'
  };
  
  // Handle different user types
  if (req.user.userType === 'worker') {
    // For workers, show all active jobs except their own (if they're also employers)
    filter.status = 'active';
    filter.employer = { $ne: req.user._id }; // Exclude jobs posted by the worker themselves
    accessContext.accessSource = 'public_worker_access';
    accessContext.jobsFrom = 'all_public_jobs';
  } else if (req.user.userType === 'employer') {
    // For employers and team members, limit jobs to accessible businesses
    const accessibleBusinesses = await getAccessibleBusinessIds(req.user);

    // Get detailed business information for transparency
    const businessDetails = await Business.find({
      _id: { $in: Array.from(accessibleBusinesses) }
    }).select('_id businessName owner').populate('owner', 'email firstName lastName');

    accessContext.accessibleBusinesses = businessDetails.map(b => ({
      businessId: b._id,
      businessName: b.businessName,
      owner: {
        id: b.owner._id,
        email: b.owner.email,
        name: `${b.owner.firstName} ${b.owner.lastName}`,
        isCurrentUser: b.owner._id.toString() === req.user._id.toString()
      }
    }));

    if (!accessibleBusinesses.size) {
      accessContext.accessSource = 'no_business_access';
      accessContext.message = 'User has no access to any businesses';
      return res.status(200).json({ 
        status: 'success', 
        results: 0, 
        data: [],
        accessContext
      });
    }

    // Determine access source
    const ownedBusinesses = accessContext.accessibleBusinesses.filter(b => b.owner.isCurrentUser);
    const partnerBusinesses = accessContext.accessibleBusinesses.filter(b => !b.owner.isCurrentUser);
    
    if (ownedBusinesses.length > 0 && partnerBusinesses.length > 0) {
      accessContext.accessSource = 'owned_and_partner_businesses';
    } else if (ownedBusinesses.length > 0) {
      accessContext.accessSource = 'owned_businesses_only';
    } else {
      accessContext.accessSource = 'partner_businesses_only';
    }

    if (req.query.businessId) {
      if (!accessibleBusinesses.has(req.query.businessId)) {
        const requestedBusiness = await Business.findById(req.query.businessId).select('businessName owner');
        accessContext.accessSource = 'no_access_to_requested_business';
        accessContext.requestedBusiness = requestedBusiness ? {
          businessId: requestedBusiness._id,
          businessName: requestedBusiness.businessName,
          ownerId: requestedBusiness.owner
        } : { businessId: req.query.businessId, found: false };
        accessContext.message = 'User does not have access to the requested business';
        return res.status(403).json({ 
          status: 'fail',
          message: 'You do not have access to jobs from the requested business',
          accessContext
        });
      }
      filter.business = req.query.businessId;
      const selectedBusiness = accessContext.accessibleBusinesses.find(b => b.businessId.toString() === req.query.businessId);
      accessContext.jobsFrom = 'specific_business';
      accessContext.selectedBusiness = selectedBusiness;
    } else {
      filter.business = { $in: Array.from(accessibleBusinesses) };
      accessContext.jobsFrom = 'all_accessible_businesses';
    }

    if (req.query.employerId && req.query.employerId !== req.user._id.toString()) {
      filter.employer = req.query.employerId;
      accessContext.jobsFrom = 'specific_employer';
      accessContext.requestedEmployerId = req.query.employerId;
    }
  }
  
  // Additional filters
  if (req.query.businessId) {
    filter.business = req.query.businessId;
  }
  if (req.query.status) {
    filter.status = req.query.status;
  } else if (!filter.status) {
    filter.status = { $ne: 'draft' }; // Exclude drafts for general listing
  }
  if (req.query.tags) {
    filter.tags = { $in: req.query.tags.split(',').map((tag) => tag.trim()) };
  }

  const jobs = await Job.find(filter)
    .populate({
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' }
    })
    .populate('employer', 'email firstName lastName userType')
    .sort({ createdAt: -1 });
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius);

  const decorated = await Promise.all(
    jobs.map(async (job) => {
      const jobResp = await buildJobResponse(job, req.user);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        const distance = haversine({
          lat1: lat,
          lon1: lng,
          lat2: job.location?.latitude,
          lon2: job.location?.longitude
        });
        jobResp.distance = distance;
        if (!Number.isNaN(radius) && distance !== null && distance > radius) {
          return null;
        }
      }
      return jobResp;
    })
  );

  const filtered = decorated.filter(Boolean);
  
  // Add summary of jobs by business
  if (req.user.userType === 'employer' && filtered.length > 0) {
    const jobsByBusiness = {};
    filtered.forEach(job => {
      const businessId = job.business._id.toString();
      if (!jobsByBusiness[businessId]) {
        jobsByBusiness[businessId] = {
          businessId: businessId,
          businessName: job.business.businessName,
          owner: job.employer,
          jobCount: 0
        };
      }
      jobsByBusiness[businessId].jobCount++;
    });
    accessContext.jobsSummary = Object.values(jobsByBusiness);
  }

  res.status(200).json({ 
    status: 'success', 
    results: filtered.length, 
    data: filtered,
    accessContext
  });
});

exports.getJobAccessContext = catchAsync(async (req, res) => {
  const accessContext = {
    userType: req.user.userType,
    userId: req.user._id,
    userEmail: req.user.email,
    accessibleBusinesses: [],
    accessSource: 'unknown'
  };

  if (req.user.userType === 'worker') {
    accessContext.accessSource = 'public_worker_access';
    accessContext.message = 'Workers can view all public job postings';
  } else if (req.user.userType === 'employer') {
    const accessibleBusinesses = await getAccessibleBusinessIds(req.user);
    
    if (!accessibleBusinesses.size) {
      accessContext.accessSource = 'no_business_access';
      accessContext.message = 'User has no access to any businesses. Create a business or get invited to one.';
    } else {
      // Get detailed business information
      const businessDetails = await Business.find({
        _id: { $in: Array.from(accessibleBusinesses) }
      }).select('_id businessName owner createdAt').populate('owner', 'email firstName lastName');

      accessContext.accessibleBusinesses = businessDetails.map(b => ({
        businessId: b._id,
        businessName: b.businessName,
        createdAt: b.createdAt,
        owner: {
          id: b.owner._id,
          email: b.owner.email,
          name: `${b.owner.firstName} ${b.owner.lastName}`,
          isCurrentUser: b.owner._id.toString() === req.user._id.toString()
        }
      }));

      // Determine access source
      const ownedBusinesses = accessContext.accessibleBusinesses.filter(b => b.owner.isCurrentUser);
      const partnerBusinesses = accessContext.accessibleBusinesses.filter(b => !b.owner.isCurrentUser);
      
      if (ownedBusinesses.length > 0 && partnerBusinesses.length > 0) {
        accessContext.accessSource = 'owned_and_partner_businesses';
        accessContext.message = `Access to ${ownedBusinesses.length} owned business(es) and ${partnerBusinesses.length} partner business(es)`;
      } else if (ownedBusinesses.length > 0) {
        accessContext.accessSource = 'owned_businesses_only';
        accessContext.message = `Access to ${ownedBusinesses.length} owned business(es)`;
      } else {
        accessContext.accessSource = 'partner_businesses_only';
        accessContext.message = `Access to ${partnerBusinesses.length} partner business(es) through team access`;
      }

      // Get job counts for each business
      const jobCounts = await Promise.all(
        accessContext.accessibleBusinesses.map(async (business) => {
          const count = await Job.countDocuments({ 
            business: business.businessId,
            status: { $ne: 'draft' }
          });
          return { businessId: business.businessId, jobCount: count };
        })
      );

      accessContext.accessibleBusinesses.forEach(business => {
        const jobInfo = jobCounts.find(jc => jc.businessId.toString() === business.businessId.toString());
        business.jobCount = jobInfo ? jobInfo.jobCount : 0;
      });
    }
  }

  res.status(200).json({
    status: 'success',
    data: accessContext
  });
});

exports.getJob = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.jobId)
    .populate({
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' }
    })
    .populate('employer', 'email firstName lastName userType');
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  const jobResp = await buildJobResponse(job, req.user);
  res.status(200).json({ status: 'success', data: jobResp });
});

exports.createJob = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Only employers can create jobs', 403));
  }

  // Accept both 'business' and 'businessId' field names for flexibility
  const businessId = req.body.business || req.body.businessId;
  if (!businessId) {
    return next(new AppError('Business must be specified for job postings (use "business" or "businessId" field)', 400));
  }

  const { business } = await ensureBusinessAccess({
    user: req.user,
    businessId,
    requiredPermissions: 'create_jobs',
  });

  const ownerUser = await User.findById(business.owner);
  if (!ownerUser) {
    return next(new AppError('Business owner not found for job creation', 400));
  }

  if (!ownerUser.premium && ownerUser.freeJobsPosted >= JOB_FREE_QUOTA) {
    return next(
      new AppError('Free job posting quota reached. Please upgrade to continue.', 402)
    );
  }

  // Create job data and ensure business field is set correctly
  const jobData = { ...req.body };
  // Remove businessId if it exists to avoid confusion
  delete jobData.businessId;
  
  const job = await Job.create({
    ...jobData,
    employer: business.owner,
    business: business._id,
    premiumRequired: !ownerUser.premium && ownerUser.freeJobsPosted >= 3
  });

  business.stats.jobsPosted += 1;
  await business.save();

  const employerProfile = await EmployerProfile.findOne({ user: business.owner });
  if (employerProfile) {
    employerProfile.totalJobsPosted += 1;
    await employerProfile.save();
  }

  if (!ownerUser.premium) {
    ownerUser.freeJobsPosted += 1;
    await ownerUser.save();
  }

  await job.populate([
    {
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' }
    },
    { path: 'employer', select: 'email firstName lastName userType' }
  ]);

  const responseData = await buildJobResponse(job, req.user);

  res.status(201).json({ status: 'success', data: responseData });
});

exports.createJobsBulk = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Only employers can create jobs', 403));
  }
  const jobsPayload = Array.isArray(req.body.jobs) ? req.body.jobs : [];
  if (!jobsPayload.length) {
    return next(new AppError('Provide at least one job payload', 400));
  }

  const cost = jobsPayload.length * 50;
  const preparedJobs = [];

  for (const job of jobsPayload) {
    const businessId = job.business;
    if (!businessId) {
      return next(new AppError('Each job must specify a business', 400));
    }

    const { business } = await ensureBusinessAccess({
      user: req.user,
      businessId,
      requiredPermissions: 'create_jobs',
    });

    preparedJobs.push({
      ...job,
      employer: business.owner,
      business: business._id,
      status: job.status || 'active',
    });
  }

  const createdJobs = await Job.insertMany(preparedJobs);
  await Job.populate(createdJobs, [
    {
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' }
    },
    { path: 'employer', select: 'email firstName lastName userType' }
  ]);

  const ownerIncrements = createdJobs.reduce((acc, job) => {
    const ownerId = job.employer?.toString();
    if (!ownerId) return acc;
    acc[ownerId] = (acc[ownerId] || 0) + 1;
    return acc;
  }, {});

  await Promise.all(
    Object.entries(ownerIncrements).map(([ownerId, count]) =>
      EmployerProfile.updateOne(
        { user: ownerId },
        { $inc: { totalJobsPosted: count } }
      )
    )
  );

  const responseJobs = await Promise.all(createdJobs.map((createdJob) => buildJobResponse(createdJob, req.user)));

  res.status(201).json({ status: 'success', data: { jobs: responseJobs, totalCost: cost } });
});

exports.updateJob = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.jobId).populate([
    { path: 'employer', select: 'email firstName lastName userType' },
    {
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' }
    }
  ]);
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  await ensureBusinessAccess({
    user: req.user,
    businessId: job.business,
    requiredPermissions: 'edit_jobs',
  });
  Object.assign(job, req.body);
  await job.save();
  await job.populate([
    {
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' }
    },
    { path: 'employer', select: 'email firstName lastName userType' }
  ]);
  const responseData = await buildJobResponse(job, req.user);
  res.status(200).json({ status: 'success', data: responseData });
});

exports.updateJobStatus = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  await ensureBusinessAccess({
    user: req.user,
    businessId: job.business,
    requiredPermissions: 'edit_jobs',
  });
  job.status = req.body.status;
  await job.save();
  await job.populate([
    {
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' }
    },
    { path: 'employer', select: 'email firstName lastName userType' }
  ]);
  const responseData = await buildJobResponse(job, req.user);
  res.status(200).json({ status: 'success', data: responseData });
});

exports.listApplicationsForJob = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  if (req.user.userType !== 'employer') {
    return next(new AppError('Not authorized to view applications for this job', 403));
  }

  await ensureBusinessAccess({
    user: req.user,
    businessId: job.business,
    requiredPermissions: 'view_applications',
  });

  await job.populate([
    { path: 'employer', select: 'email firstName lastName userType' },
    {
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' }
    }
  ]);

  const applications = await Application.find({ job: job._id })
    .populate('worker', 'firstName lastName email phone')
    .sort({ createdAt: -1 });
  const ownershipTag =
    req.user.userType === 'employer'
      ? resolveOwnershipTag(req.user, job.employer, job.business?.owner)
      : null;
  const data = applications.map((application) => {
    const plain = application.toObject({ virtuals: true });
    if (ownershipTag) {
      plain.createdByTag = ownershipTag;
    }
    return plain;
  });
  res.status(200).json({ status: 'success', data });
});

exports.hireApplicant = catchAsync(async (req, res, next) => {
  const application = await Application.findById(req.params.applicationId).populate({
    path: 'job',
    populate: [
      { path: 'employer', select: 'email firstName lastName userType' },
      {
        path: 'business',
        populate: { path: 'owner', select: 'email firstName lastName' }
      }
    ]
  });
  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  // Check if user has access to hire for this job's business
  // Use ensureBusinessAccess to support both job owners and team members with hiring permissions
  const job = application.job;
  const isJobOwner = job?.employer?.toString() === req.user._id.toString();
  let hasAccess = isJobOwner;
  let accessError = null;

  if (!hasAccess && job?.business) {
    try {
      await ensureBusinessAccess({
        user: req.user,
        businessId: job.business,
        requiredPermissions: 'hire_workers',
      });
      hasAccess = true;
    } catch (error) {
      accessError = error;
    }
  }

  if (!hasAccess) {
    if (accessError) {
      return next(accessError);
    }
    return next(new AppError('You can only hire for jobs you have access to manage', 403));
  }

  // Update application status
  application.status = 'hired';
  application.hiredAt = new Date();
  await application.save();

  // Reject other applications for this job
  await Application.updateMany(
    { job: application.job._id, _id: { $ne: application._id } },
    { status: 'rejected', rejectedAt: new Date() }
  );

  // Update job status
  application.job.status = 'filled';
  application.job.hiredWorker = application.worker;
  await application.job.save();

  // Build structured work location data from the job location snapshot (if available)
  let workLocationDetails;
  let workLocationLabel;
  if (application.job.location && (application.job.location.latitude != null && application.job.location.longitude != null)) {
    const { latitude, longitude } = application.job.location;
    workLocationLabel = buildLocationLabel({
      formattedAddress: application.job.location.formattedAddress,
      address: application.job.location.address,
      city: application.job.location.city,
      state: application.job.location.state,
      postalCode: application.job.location.postalCode,
      label: application.job.title
    });
    workLocationDetails = {
      label: application.job.title,
      formattedAddress: workLocationLabel,
      latitude,
      longitude,
      allowedRadius: DEFAULT_ALLOWED_RADIUS_METERS,
      setBy: req.user._id,
      setAt: new Date()
    };
  } else if (application.job.location) {
    workLocationLabel = buildLocationLabel({
      formattedAddress: application.job.location.formattedAddress,
      address: application.job.location.address,
      city: application.job.location.city,
      state: application.job.location.state,
      postalCode: application.job.location.postalCode,
      label: application.job.title
    });
  }

  // Create employment record for hire tracking
  const employmentRecord = await WorkerEmployment.create({
    worker: application.worker,
    employer: req.user._id,
    business: application.job.business,
    job: application.job._id,
    application: application._id,
    hireDate: new Date(),
    employmentStatus: 'active',
    position: application.job.title,
    hourlyRate: application.job.hourlyRate,
    workLocation: workLocationLabel,
    workLocationDetails,
    startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
    endDate: null // Initially null for active employment
  });

  // Update worker profile with current employment info
  await WorkerProfile.updateOne(
    { user: application.worker },
    {
      $inc: { completedJobs: 1 },
      $set: {
        employmentStatus: 'employed',
        currentEmployer: req.user._id,
        hireDate: new Date()
      }
    }
  );

  // Update business and employer stats
  await Business.updateOne(
    { _id: application.job.business },
    { $inc: { 'stats.hires': 1 } }
  );
  await EmployerProfile.updateOne(
    { user: req.user._id },
    { $inc: { totalHires: 1 } }
  );

  // Return enriched response with employment info
  const responseData = {
    ...application.toObject(),
    employmentRecord: {
      employmentId: employmentRecord._id,
      hireDate: employmentRecord.hireDate,
      position: employmentRecord.position,
      hourlyRate: employmentRecord.hourlyRate,
      employmentStatus: employmentRecord.employmentStatus
    }
  };

  if (req.user.userType === 'employer') {
    const ownershipTag = resolveOwnershipTag(
      req.user,
      application.job?.employer,
      application.job?.business?.owner
    );
    if (ownershipTag) {
      responseData.createdByTag = ownershipTag;
      if (responseData.job) {
        responseData.job.createdByTag = ownershipTag;
      }
    }
  }

  res.status(200).json({ 
    status: 'success', 
    message: 'Applicant hired successfully and employment record created',
    data: responseData 
  });
});

// Get all jobs by id (for both employer and hired worker)
exports.getJobsByUserId = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      status: 'error',
      message: 'Id parameter is required'
    });
  }

  // Find user by _id
  const user = await User.findById(id).select('_id firstName lastName email userType');  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found with the provided id'
    });
  }

  // Find all jobs where user is either employer or hired worker
  const jobs = await Job.find({
    $or: [
      { employer: user._id },
      { hiredWorker: user._id }
    ]
  })
  .populate('employer', 'userId firstName lastName email')
  .populate('hiredWorker', 'userId firstName lastName email')
  .populate('business', 'name address')
  .sort({ createdAt: -1 });

  // Categorize jobs
  const categorizedJobs = {
    postedJobs: jobs.filter(job => job.employer._id.toString() === user._id.toString()),
    hiredJobs: jobs.filter(job => job.hiredWorker && job.hiredWorker._id.toString() === user._id.toString())
  };

  res.status(200).json({
    status: 'success',
    results: jobs.length,
    data: {
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        userType: user.userType
      },
      jobs: categorizedJobs,
      summary: {
        totalJobs: jobs.length,
        postedJobs: categorizedJobs.postedJobs.length,
        hiredJobs: categorizedJobs.hiredJobs.length
      }
    }
  });
});
