const WorkerFeedback = require('./workerFeedback.model');
const WorkerEmployment = require('../workers/workerEmployment.model');
const User = require('../users/user.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');

const mapFeedbackResponse = (feedback) => {
  if (!feedback) return null;

  const plain =
    typeof feedback.toObject === 'function' ? feedback.toObject() : feedback;

  const worker = plain.worker || {};
  const employer = plain.employer || {};
  const job = plain.job || {};

  return {
    id: plain._id?.toString() || plain.id?.toString(),
    rating: plain.rating,
    comment: plain.comment,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    worker: {
      id: worker._id?.toString(),
      firstName: worker.firstName,
      lastName: worker.lastName,
      fullName: [worker.firstName, worker.lastName].filter(Boolean).join(' '),
    },
    employer: {
      id: employer._id?.toString(),
      firstName: employer.firstName,
      lastName: employer.lastName,
      fullName: [employer.firstName, employer.lastName]
        .filter(Boolean)
        .join(' '),
    },
    job: job
      ? {
          id: job._id?.toString() || job.id?.toString(),
          title: job.title,
        }
      : undefined,
  };
};

exports.createFeedback = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'worker') {
    return next(
      new AppError('Only workers can submit employer feedback', 403)
    );
  }

  const { employerId, rating, comment, jobId } = req.body;

  if (!employerId) {
    return next(new AppError('employerId is required', 400));
  }

  const normalizedRating = Number(rating);
  if (
    Number.isNaN(normalizedRating) ||
    normalizedRating < 1 ||
    normalizedRating > 5
  ) {
    return next(new AppError('rating must be between 1 and 5', 400));
  }

  const employer = await User.findById(employerId).select(
    '_id userType firstName lastName'
  );
  if (!employer || employer.userType !== 'employer') {
    return next(new AppError('Employer not found', 404));
  }

  const employmentQuery = {
    worker: req.user._id,
    employer: employer._id,
  };
  if (jobId) {
    employmentQuery.job = jobId;
  }

  const employment = await WorkerEmployment.findOne(employmentQuery).select(
    '_id job'
  );
  if (!employment) {
    return next(
      new AppError(
        'You can only review employers you have worked for',
        403
      )
    );
  }

  const feedbackQuery = {
    worker: req.user._id,
    employer: employer._id,
  };
  if (jobId || employment.job) {
    feedbackQuery.job = jobId || employment.job;
  }

  let feedback = await WorkerFeedback.findOne(feedbackQuery);
  let isNew = false;
  if (feedback) {
    feedback.rating = normalizedRating;
    feedback.comment = comment ? comment.toString().trim() : '';
    if (jobId) {
      feedback.job = jobId;
    }
    await feedback.save();
  } else {
    feedback = await WorkerFeedback.create({
      worker: req.user._id,
      employer: employer._id,
      job: jobId || employment.job,
      rating: normalizedRating,
      comment: comment ? comment.toString().trim() : '',
    });
    isNew = true;
  }

  await feedback.populate([
    { path: 'worker', select: 'firstName lastName' },
    { path: 'employer', select: 'firstName lastName' },
    { path: 'job', select: 'title' },
  ]);

  res.status(isNew ? 201 : 200).json({
    status: 'success',
    data: mapFeedbackResponse(feedback),
  });
});

exports.listEmployerFeedback = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(
      new AppError('Only employers can view worker feedback', 403)
    );
  }

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  const skip = (page - 1) * limit;

  const filter = { employer: req.user._id };

  const [feedbackItems, total] = await Promise.all([
    WorkerFeedback.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('worker', 'firstName lastName')
      .populate('employer', 'firstName lastName')
      .populate('job', 'title'),
    WorkerFeedback.countDocuments(filter),
  ]);

  const data = feedbackItems.map(mapFeedbackResponse);

  res.status(200).json({
    status: 'success',
    results: data.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    data,
  });
});

exports.listWorkerFeedback = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'worker') {
    return next(
      new AppError('Only workers can view their submitted feedback', 403)
    );
  }

  const feedbackItems = await WorkerFeedback.find({
    worker: req.user._id,
  })
    .sort({ updatedAt: -1 })
    .populate('employer', 'firstName lastName')
    .populate('job', 'title');

  res.status(200).json({
    status: 'success',
    results: feedbackItems.length,
    data: feedbackItems.map(mapFeedbackResponse),
  });
});
