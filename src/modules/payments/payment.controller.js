const https = require('https');
const crypto = require('crypto');
const Payment = require('./payment.model');
const Job = require('../jobs/job.model');
const EmployerProfile = require('../employers/employerProfile.model');
const Business = require('../businesses/business.model');
const User = require('../users/user.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');
const { ensureBusinessAccess } = require('../../shared/utils/businessAccess');

const RAZORPAY_API_HOST = 'api.razorpay.com';
const RAZORPAY_ORDER_PATH = '/v1/orders';

const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }
  return false;
};

const createRazorpayRequest = (payload, keyId, keySecret) =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = https.request(
      {
        host: RAZORPAY_API_HOST,
        path: RAZORPAY_ORDER_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Authorization: `Basic ${Buffer.from(
            `${keyId}:${keySecret}`
          ).toString('base64')}`,
        },
      },
      (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            if (response.statusCode >= 200 && response.statusCode < 300) {
              resolve(parsed);
            } else {
              const message =
                parsed?.error?.description ||
                parsed?.message ||
                'Failed to create Razorpay order';
              reject(new AppError(message, response.statusCode));
            }
          } catch (error) {
            reject(
              new AppError('Unable to parse Razorpay response', 502)
            );
          }
        });
      }
    );

    request.on('error', (error) => {
      reject(
        new AppError(
          `Unable to contact Razorpay: ${error.message}`,
          502
        )
      );
    });

    request.write(body);
    request.end();
  });

const ensureEmployerUser = (req, next) => {
  if (req.user.userType !== 'employer') {
    next(new AppError('Only employers can process job payments', 403));
    return false;
  }
  return true;
};

const buildJobLookupMap = async (payments) => {
  const jobIds = [
    ...new Set(
      payments
        .map((payment) => payment.metadata?.jobId)
        .filter(Boolean)
        .map((id) => id.toString())
    ),
  ];

  if (!jobIds.length) {
    return new Map();
  }

  const jobs = await Job.find({ _id: { $in: jobIds } })
    .select('title business')
    .populate('business', 'businessName name');

  const lookup = new Map();
  jobs.forEach((job) => {
    const businessName =
      job.business?.businessName || job.business?.name || null;
    lookup.set(job._id.toString(), {
      id: job._id.toString(),
      title: job.title,
      businessName,
    });
  });
  return lookup;
};

const findJobWithPaymentAccess = async ({
  user,
  jobId,
  requiredPermissions = 'process_payments',
}) => {
  if (!jobId) {
    throw new AppError('jobId is required to process payments', 400);
  }

  const job = await Job.findById(jobId).select(
    '_id business status premiumRequired isPublished publishedAt publishedBy employer'
  );

  if (!job) {
    throw new AppError('Job not found or access denied', 404);
  }

  const userId =
    (user?._id && user._id.toString && user._id.toString()) ||
    (user?.id && user.id.toString && user.id.toString());

  if (!userId) {
    throw new AppError('User context missing for payment processing', 401);
  }

  const isOwner = job.employer && job.employer.toString() === userId;
  if (isOwner) {
    return job;
  }

  if (!job.business) {
    throw new AppError('Job not found or access denied', 404);
  }

  await ensureBusinessAccess({
    user,
    businessId: job.business,
    requiredPermissions,
  });

  return job;
};

exports.createRazorpayOrder = catchAsync(async (req, res, next) => {
  if (!ensureEmployerUser(req, next)) return;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return next(
      new AppError(
        'Razorpay credentials are not configured on the server',
        500
      )
    );
  }

  const amountRaw = Number(req.body.amount);
  if (!amountRaw || Number.isNaN(amountRaw) || amountRaw <= 0) {
    return next(new AppError('Payment amount is required', 400));
  }

  const currency = (req.body.currency || 'INR').toUpperCase();
  const jobId = req.body.jobId;
  if (!jobId) {
    return next(new AppError('jobId is required to create an order', 400));
  }

  const job = await findJobWithPaymentAccess({
    user: req.user,
    jobId,
  });

  const providedReceipt =
    typeof req.body.receipt === 'string' ? req.body.receipt.trim() : '';
  const receiptBase =
    providedReceipt.length > 0 ? providedReceipt : null;
  let receiptValue = receiptBase;

  if (!receiptValue) {
    const timeFragment = Date.now().toString(36);
    const idFragment = jobId.toString().replace(/[^a-zA-Z0-9]/g, '').slice(-10);
    receiptValue = `job_${idFragment}_${timeFragment}`;
  }
  if (receiptValue.length > 40) {
    receiptValue = receiptValue.slice(0, 40);
  }

  const orderPayload = {
    amount: Math.round(amountRaw),
    currency,
    receipt: receiptValue,
    notes: {
      jobId,
      employer: req.user._id.toString(),
      intent: 'job_posting',
      ...(req.body.notes || {}),
    },
    payment_capture: 1,
  };

  const order = await createRazorpayRequest(
    orderPayload,
    keyId,
    keySecret
  );

  await Payment.findOneAndUpdate(
    { reference: order.id },
    {
      employer: req.user._id,
      amount: amountRaw / 100,
      currency,
      description: 'Job posting payment',
      status: 'pending',
      metadata: {
        jobId,
        intent: 'job_posting',
        order,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({
    status: 'success',
    data: { order },
  });
});

exports.verifyRazorpayPayment = catchAsync(async (req, res, next) => {
  if (!ensureEmployerUser(req, next)) return;

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return next(
      new AppError(
        'Razorpay secret is not configured on the server',
        500
      )
    );
  }

  const {
    jobId,
    orderId,
    paymentId,
    signature,
    amount,
    currency,
    status,
  } = req.body;

  if (!jobId) {
    return next(new AppError('jobId is required', 400));
  }
  if (!orderId || !paymentId || !signature) {
    return next(
      new AppError(
        'orderId, paymentId, and signature are required for verification',
        400
      )
    );
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  if (expectedSignature !== signature) {
    return next(new AppError('Invalid Razorpay payment signature', 400));
  }

  const job = await findJobWithPaymentAccess({
    user: req.user,
    jobId,
  });

  const paymentUpdate = {
    employer: req.user._id,
    currency: (currency || 'INR').toUpperCase(),
    description: 'Job posting payment',
    status: status === 'failed' ? 'failed' : 'succeeded',
    metadata: {
      jobId,
      intent: 'job_posting',
      orderId,
      paymentId,
      signature,
    },
  };

  const normalizedAmount =
    amount && Number(amount) > 0 ? Number(amount) / 100 : null;
  if (normalizedAmount !== null) {
    paymentUpdate.amount = normalizedAmount;
  }

  let payment = await Payment.findOne({
    reference: orderId,
    employer: req.user._id,
  });

  if (payment) {
    payment.set({
      ...paymentUpdate,
      metadata: {
        ...(payment.metadata || {}),
        ...paymentUpdate.metadata,
      },
    });
    await payment.save();
  } else {
    payment = await Payment.create({
      ...paymentUpdate,
      amount: normalizedAmount ?? 0,
      reference: orderId,
    });
  }

  const wasActive = job.status === 'active';
  const publishParamKey = ['publish', 'publishAfterPayment'].find((key) =>
    Object.prototype.hasOwnProperty.call(req.body, key)
  );
  const publishRequested =
    publishParamKey !== undefined
      ? parseBoolean(req.body[publishParamKey])
      : undefined;

  const shouldPublish =
    publishRequested === true ||
    (publishRequested === undefined && job.premiumRequired);

  if (payment.status === 'succeeded') {
    let jobChanged = false;
    if (job.status !== 'active') {
      job.status = 'active';
      jobChanged = true;
    }
    if (job.premiumRequired) {
      job.premiumRequired = false;
      jobChanged = true;
    }

    if (shouldPublish && !job.isPublished) {
      job.isPublished = true;
      job.publishedAt = new Date();
      job.publishedBy = req.user._id;
      jobChanged = true;
    }

    if (jobChanged) {
      await job.save();
    }

    if (!wasActive) {
      await EmployerProfile.updateOne(
        { user: req.user._id },
        { $inc: { totalJobsPosted: 1 } }
      );
      await Business.updateOne(
        { _id: job.business },
        { $inc: { 'stats.jobsPosted': 1 } }
      );
    }

    if (!req.user.premium) {
      await User.updateOne({ _id: req.user._id }, { premium: true });
      req.user.premium = true;
    }
  }

  res.status(200).json({
    status: 'success',
    data: { payment, job },
  });
});

exports.listJobPayments = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Only employers can view job payments', 403));
  }

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  const skip = (page - 1) * limit;

  const baseFilter = {
    employer: req.user._id,
    'metadata.intent': req.query.intent || 'job_posting',
  };

  if (req.query.status) {
    baseFilter.status = req.query.status;
  }

  const [payments, total] = await Promise.all([
    Payment.find(baseFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: false }),
    Payment.countDocuments(baseFilter),
  ]);

  const jobLookup = await buildJobLookupMap(payments);

  const records = payments.map((payment) => {
    const jobId = payment?.metadata?.jobId
      ? payment.metadata.jobId.toString()
      : null;
    const jobInfo = jobId ? jobLookup.get(jobId) : null;

    return {
      id: payment._id.toString(),
      amount: payment.amount,
      currency: payment.currency || 'INR',
      status: payment.status,
      description:
        payment.description || payment.metadata?.description || 'Job payment',
      reference: payment.reference,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      job: jobInfo
        ? {
            id: jobInfo.id,
            title: jobInfo.title,
            businessName: jobInfo.businessName,
          }
        : jobId
        ? { id: jobId }
        : null,
      metadata: payment.metadata || {},
    };
  });

  res.status(200).json({
    status: 'success',
    results: records.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    data: records,
  });
});

exports.processJobPayment = catchAsync(async (req, res, next) => {
  if (!ensureEmployerUser(req, next)) return;

  const { job: jobPayload, jobId } = req.body;

  if (!jobPayload && !jobId) {
    return next(new AppError('Job payload or jobId is required', 400));
  }

  const publishParamKey = ['publish', 'publishAfterPayment'].find((key) =>
    Object.prototype.hasOwnProperty.call(req.body, key)
  );
  const publishRequested =
    publishParamKey !== undefined
      ? parseBoolean(req.body[publishParamKey])
      : undefined;

  if (jobPayload) {
    const reference = `legacy_${crypto.randomBytes(6).toString('hex')}`;
    const payment = await Payment.create({
      employer: req.user._id,
      amount: req.body.amount || 0,
      currency: req.body.currency || 'USD',
      description: req.body.description || 'Job posting purchase',
      status: 'succeeded',
      reference,
      metadata: { intent: 'job_posting', legacy: true },
    });

    const sanitizedJob = { ...jobPayload };
    delete sanitizedJob.publish;
    delete sanitizedJob.publishAfterPayment;
    delete sanitizedJob.published;
    delete sanitizedJob.isPublished;
    delete sanitizedJob.publishedAt;
    delete sanitizedJob.publishedBy;
    delete sanitizedJob.publishStatus;
    delete sanitizedJob.publishActionRequired;

    const job = await Job.create({
      ...sanitizedJob,
      employer: req.user._id,
      business: jobPayload.business,
      premiumRequired: false,
      status: 'active',
      isPublished: publishRequested === true,
      publishedAt: publishRequested === true ? new Date() : null,
      publishedBy: publishRequested === true ? req.user._id : null,
    });

    await EmployerProfile.updateOne(
      { user: req.user._id },
      { $inc: { totalJobsPosted: 1 } }
    );
    await Business.updateOne(
      { _id: job.business },
      { $inc: { 'stats.jobsPosted': 1 } }
    );

    return res
      .status(201)
      .json({ status: 'success', data: { payment, job } });
  }

  const job = await findJobWithPaymentAccess({
    user: req.user,
    jobId,
  });

  let jobChanged = false;
  if (job.status !== 'active') {
    job.status = 'active';
    jobChanged = true;
  }
  if (job.premiumRequired) {
    job.premiumRequired = false;
    jobChanged = true;
  }
  if (publishRequested === true && !job.isPublished) {
    job.isPublished = true;
    job.publishedAt = new Date();
    job.publishedBy = req.user._id;
    jobChanged = true;
  }
  if (jobChanged) {
    await job.save();
  }

  const reference = `pay_${crypto.randomBytes(6).toString('hex')}`;
  const payment = await Payment.create({
    employer: req.user._id,
    amount: req.body.amount || 0,
    currency: (req.body.currency || 'INR').toUpperCase(),
    description: req.body.description || 'Job posting payment',
    status: req.body.status === 'failed' ? 'failed' : 'succeeded',
    reference,
    metadata: {
      intent: 'job_posting',
      jobId,
      notes: req.body.notes || {},
    },
  });

  await EmployerProfile.updateOne(
    { user: req.user._id },
    { $inc: { totalJobsPosted: 1 } }
  );
  await Business.updateOne(
    { _id: job.business },
    { $inc: { 'stats.jobsPosted': 1 } }
  );

  res.status(200).json({ status: 'success', data: { payment, job } });
});
