const Application = require('./application.model');
const Job = require('../jobs/job.model');
const WorkerProfile = require('../workers/workerProfile.model');
const User = require('../users/user.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const { ensureBusinessAccess, getAccessibleBusinessIds } = require('../../shared/utils/businessAccess');
const notificationService = require('../notifications/notification.service');
const { resolveOwnershipTag } = require('../../shared/utils/ownershipTag');

const populateJobOwnership = [
  {
    path: 'job',
    populate: [
      { path: 'employer', select: 'email firstName lastName userType' },
      {
        path: 'business',
        populate: { path: 'owner', select: 'email firstName lastName' }
      }
    ]
  }
];

const formatApplicationResponse = (applicationDoc, currentUser) => {
  if (!applicationDoc) {
    return null;
  }
  const plain = applicationDoc.toObject({ virtuals: true });

  if (currentUser?.userType === 'employer' && plain.job) {
    const ownershipTag = resolveOwnershipTag(
      currentUser,
      plain.job.employer,
      plain.job.business?.owner
    );
    if (ownershipTag) {
      plain.createdByTag = ownershipTag;
      plain.job.createdByTag = ownershipTag;
    }
  }

  return plain;
};

const APPLICATION_FREE_QUOTA = 3;

exports.createApplication = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'worker') {
    return next(new AppError('Only workers can apply to jobs', 403));
  }

  const jobId = req.params.jobId || req.body.jobId;
  if (!jobId) {
    return next(new AppError('Job ID is required to apply', 400));
  }

  const job = await Job.findById(jobId);
  if (!job || job.status !== 'active') {
    return next(new AppError('Job is not available for applications', 400));
  }

  const existing = await Application.findOne({ job: job._id, worker: req.user._id });
  if (existing) {
    return next(new AppError('You have already applied to this job', 400));
  }

  if (!req.user.premium && req.user.freeApplicationsUsed >= APPLICATION_FREE_QUOTA) {
    return next(new AppError('Free application limit reached. Upgrade to continue.', 402));
  }

  const profile = await WorkerProfile.findOne({ user: req.user._id });

  const application = await Application.create({
    job: job._id,
    worker: req.user._id,
    message: req.body.message || '',
    snapshot: {
      name: req.user.fullName,
      email: req.user.email,
      phone: req.user.phone,
      skills: profile?.skills || [],
      experience: profile?.experience || ''
    }
  });

  job.applicantsCount += 1;
  await job.save();

  if (job.employer && job.employer.toString() !== req.user._id.toString()) {
    const applicantName = req.user.fullName || req.user.firstName || 'A worker';
    await notificationService.sendSafeNotification({
      recipient: job.employer,
      type: 'application',
      priority: 'medium',
      title: `${applicantName} applied to ${job.title}`,
      message: `${applicantName} applied to your job "${job.title}".`,
      metadata: {
        applicationId: application._id,
        jobId: job._id,
        workerId: req.user._id
      },
      senderUserId: req.user._id
    });
  }

  if (!req.user.premium) {
    req.user.freeApplicationsUsed += 1;
    await req.user.save();
  }

  res.status(201).json({ status: 'success', data: application });
});

exports.listMyApplications = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'worker') {
    return next(new AppError('Only workers can view their applications', 403));
  }
  const applications = await Application.find({ worker: req.user._id })
    .populate(populateJobOwnership)
    .sort({ createdAt: -1 });
  res.status(200).json({ status: 'success', data: applications });
});

exports.updateApplication = catchAsync(async (req, res, next) => {
  const application = await Application.findById(req.params.applicationId).populate(populateJobOwnership);
  if (!application) {
    return next(new AppError('Application not found', 404));
  }
  const job = application.job;
  if (req.user.userType === 'worker') {
    if (application.worker.toString() !== req.user._id.toString()) {
      return next(new AppError('You can only modify your application', 403));
    }
    const previousStatus = application.status;
    let statusChangedToWithdrawn = false;

    if (req.body.status === 'withdrawn') {
      if (previousStatus === 'hired') {
        return next(new AppError('You cannot withdraw an application that has already been hired', 400));
      }

      if (previousStatus === 'rejected') {
        return next(new AppError('You cannot withdraw an application that has already been decided', 400));
      }

      if (previousStatus !== 'withdrawn') {
        application.status = 'withdrawn';
        application.withdrawnAt = new Date();
        application.rejectedAt = undefined;
        statusChangedToWithdrawn = true;

        if (application.job && typeof application.job.applicantsCount === 'number') {
          if (typeof application.job.save === 'function' && previousStatus === 'pending') {
            application.job.applicantsCount = Math.max(0, application.job.applicantsCount - 1);
            await application.job.save();
          }
        }
      }
    }

    if (typeof req.body.message !== 'undefined') {
      application.message = req.body.message;
    }

    await application.save();
    if (
      statusChangedToWithdrawn &&
      job?.employer &&
      job.employer.toString() !== req.user._id.toString()
    ) {
      const workerName = req.user.fullName || req.user.firstName || 'A worker';
      await notificationService.sendSafeNotification({
        recipient: job.employer,
        type: 'application_update',
        priority: 'low',
        title: `Application withdrawn for ${job.title}`,
        message: `${workerName} withdrew their application for "${job.title}".`,
        metadata: {
          applicationId: application._id,
          jobId: job._id,
          workerId: req.user._id,
          status: application.status
        },
        senderUserId: req.user._id
      });
    }

    const updatedApplication = await Application.findById(application._id).populate(populateJobOwnership);
    return res.status(200).json({ status: 'success', data: formatApplicationResponse(updatedApplication, req.user) });
  }
  // Check if user can manage this application (employer OR business owner)
  const jobBusiness = application.job?.business;
  const businessReference =
    jobBusiness && typeof jobBusiness === 'object' && jobBusiness !== null
      ? jobBusiness._id || jobBusiness.id || jobBusiness
      : jobBusiness;
  const businessId =
    typeof businessReference === 'string'
      ? businessReference
      : businessReference?.toString?.();
  const normalizedBusinessId = businessId && businessId !== '[object Object]' ? businessId : null;
  const isDirectOwner =
    application.job &&
    application.job.business &&
    application.job.business.owner &&
    application.job.business.owner.toString() === req.user._id.toString();

  let hasJobAccess = req.user.userType === 'employer' || isDirectOwner;
  if (!hasJobAccess && normalizedBusinessId) {
    const accessibleBusinesses = await getAccessibleBusinessIds(req.user);
    if (accessibleBusinesses.has(normalizedBusinessId)) {
      hasJobAccess = true;
    }
  }

  if (hasJobAccess) {
    if (!application.job) {
      return next(new AppError('Job information missing for application', 400));
    }

    console.log('🔍 Business access check:', {
      userId: req.user._id.toString(),
      businessId: normalizedBusinessId,
      userRole: req.user.userType,
      isBusinessOwner: isDirectOwner
    });

    try {
      await ensureBusinessAccess({
        user: req.user,
        businessId: businessReference,
        requiredPermissions: ['manage_applications', 'hire_workers'],
      });
    } catch (error) {
      console.log('❌ Business access failed for application update:', error.message);
      return next(error);
    }

    const previousStatus = application.status;
    const nextStatus = req.body.status;

    if (!['pending', 'hired', 'rejected'].includes(nextStatus)) {
      return next(new AppError('Invalid status', 400));
    }
    application.status = nextStatus;
    if (nextStatus === 'hired') {
      application.hiredAt = new Date();
      application.withdrawnAt = undefined;
    }
    if (nextStatus === 'rejected') {
      application.rejectedAt = new Date();
      application.withdrawnAt = undefined;
    }
    await application.save();
    if (
      previousStatus !== nextStatus &&
      application.worker &&
      application.worker.toString() !== req.user._id.toString()
    ) {
      const employerName = req.user.fullName || req.user.firstName || 'An employer';
      const jobTitle = job?.title || 'a job';
      let type = 'application_update';
      let title = `Application update for ${jobTitle}`;
      let message = `${employerName} updated the status of your application for "${jobTitle}" to ${nextStatus}.`;
      let priority = 'medium';

      if (nextStatus === 'hired') {
        type = 'hire';
        title = `You're hired for ${jobTitle}`;
        message = `${employerName} hired you for "${jobTitle}".`;
        priority = 'high';
      } else if (nextStatus === 'rejected') {
        title = `Application update for ${jobTitle}`;
        message = `${employerName} is unable to move forward with your application for "${jobTitle}".`;
        priority = 'low';
      }

      await notificationService.sendSafeNotification({
        recipient: application.worker,
        type,
        priority,
        title,
        message,
        metadata: {
          applicationId: application._id,
          jobId: job?._id,
          status: nextStatus
        },
        senderUserId: req.user._id
      });
    }
    await application.populate(populateJobOwnership);
    return res.status(200).json({ status: 'success', data: formatApplicationResponse(application, req.user) });
  }
  return next(new AppError('Not authorized to update application', 403));
});

exports.listApplications = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.workerId) {
    filter.worker = req.query.workerId;
  }
  if (req.query.jobId) {
    filter.job = req.query.jobId;
  }
  const applications = await Application.find(filter)
    .populate(populateJobOwnership)
    .populate('worker');
  const data = applications.map((application) => formatApplicationResponse(application, req.user));
  res.status(200).json({ status: 'success', data });
});

// Get all applications by id (for both worker and employer)
exports.getApplicationsByUserId = catchAsync(async (req, res) => {
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

  // Find all applications where user is either worker or employer
  const applications = await Application.find({
    $or: [
      { worker: user._id },
    ]
  })
  .populate({
    path: 'worker',
    select: 'userId firstName lastName email phone'
  })
  .populate({
    path: 'job',
    select: 'title description hourlyRate status location schedule',
    populate: {
      path: 'employer',
      select: 'userId firstName lastName email'
    }
  })
  .sort({ createdAt: -1 });

  // Also find applications to jobs posted by the user (if employer)
  const employerApplications = await Application.find()
    .populate({
      path: 'worker',
      select: 'userId firstName lastName email phone'
    })
    .populate({
      path: 'job',
      match: { employer: user._id },
      select: 'title description hourlyRate status location schedule',
      populate: {
        path: 'employer',
        select: 'userId firstName lastName email'
      }
    })
    .then(apps => apps.filter(app => app.job !== null))
    .sort({ createdAt: -1 });

  // Categorize applications
  const categorizedApplications = {
    workerApplications: applications.filter(app => app.worker._id.toString() === user._id.toString()),
    employerApplications: employerApplications
  };

  res.status(200).json({
    status: 'success',
    results: applications.length + employerApplications.length,
    data: {
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        userType: user.userType
      },
      applications: categorizedApplications,
      summary: {
        totalApplications: applications.length + employerApplications.length,
        workerApplications: categorizedApplications.workerApplications.length,
        employerApplications: categorizedApplications.employerApplications.length
      }
    }
  });
});
