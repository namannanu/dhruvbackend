const crypto = require('crypto');
const Payment = require('./payment.model');
const Job = require('../jobs/job.model');
const EmployerProfile = require('../employers/employerProfile.model');
const Business = require('../businesses/business.model');
const Subscription = require('../subscriptions/subscription.model');
const User = require('../users/user.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');

const PREMIUM_PLAN_PRICING = Object.freeze({
  monthly: 29900,
  yearly: 299900
});

let razorpayClient = null;
let razorpayReady = false;

try {
  // Lazily require Razorpay so the app still boots when the SDK is not installed yet.
  // eslint-disable-next-line global-require
  const Razorpay = require('razorpay');
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    razorpayReady = true;
  }
} catch (error) {
  // Razorpay is optional – we fall back to mock order generation when unavailable.
  razorpayClient = null;
  razorpayReady = false;
}

const isRazorpayEnabled = () => razorpayReady && !!razorpayClient;

const generateMockOrder = ({ amount, currency, receipt, notes }) => ({
  id: `order_${crypto.randomBytes(8).toString('hex')}`,
  amount,
  currency,
  receipt,
  status: 'created',
  notes,
  mock: true
});

const buildOrderPayload = ({ amount, currency, receipt, notes }) => ({
  amount,
  currency,
  receipt,
  notes
});

const createOrder = async payload => {
  if (isRazorpayEnabled()) {
    return razorpayClient.orders.create(payload);
  }
  return generateMockOrder(payload);
};

const ensureAmount = value => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed);
};

exports.processJobPayment = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Only employers can process job payments', 403));
  }
  if (!req.body.job) {
    return next(new AppError('Job payload is required', 400));
  }

  const reference = `pay_${crypto.randomBytes(6).toString('hex')}`;
  const payment = await Payment.create({
    employer: req.user._id,
    amount: req.body.amount || 0,
    currency: req.body.currency || 'USD',
    description: req.body.description || 'Job posting purchase',
    status: 'succeeded',
    reference,
    metadata: { intent: 'job_posting' }
  });

  const job = await Job.create({
    ...req.body.job,
    employer: req.user._id,
    business: req.body.job.business || req.user.selectedBusiness,
    premiumRequired: false,
    status: 'active'
  });

  await EmployerProfile.updateOne(
    { user: req.user._id },
    { $inc: { totalJobsPosted: 1 } }
  );
  await Business.updateOne(
    { _id: job.business },
    { $inc: { 'stats.jobsPosted': 1 } }
  );

  res.status(201).json({ status: 'success', data: { payment, job } });
});

exports.createRazorpayOrder = catchAsync(async (req, res, next) => {
  const amount = ensureAmount(req.body.amount);
  if (!amount) {
    return next(new AppError('A valid payment amount is required', 400));
  }

  const currency = (req.body.currency || 'INR').toUpperCase();
  const description = req.body.description || 'Job posting payment';
  const receipt = req.body.receipt || `job_${Date.now()}`;
  const notes = { ...(req.body.notes || {}), intent: req.body.intent || 'job_posting' };
  if (req.businessId) {
    notes.businessId = req.businessId;
  }

  const orderPayload = buildOrderPayload({
    amount,
    currency,
    receipt,
    notes
  });

  const order = await createOrder(orderPayload);
  const payment = await Payment.create({
    employer: req.body.employer || req.user._id,
    amount: order.amount,
    currency: order.currency,
    description,
    status: 'pending',
    reference: order.id,
    metadata: {
      intent: notes.intent,
      provider: 'razorpay',
      notes,
      business: req.businessId || null,
      mock: !isRazorpayEnabled()
    }
  });

  res.status(201).json({
    status: 'success',
    data: {
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        notes: order.notes
      },
      paymentId: payment._id,
      razorpayKey: process.env.RAZORPAY_KEY_ID || null,
      mock: !isRazorpayEnabled()
    }
  });
});

exports.verifyRazorpayPayment = catchAsync(async (req, res, next) => {
  const { orderId, paymentId, signature, status } = req.body;
  if (!orderId || !paymentId) {
    return next(new AppError('orderId and paymentId are required', 400));
  }

  if (isRazorpayEnabled() && signature) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      return next(new AppError('Invalid Razorpay signature', 400));
    }
  }

  const payment = await Payment.findOne({ reference: orderId });
  if (!payment) {
    return next(new AppError('Payment order not found', 404));
  }

  payment.status = status === 'failed' ? 'failed' : 'succeeded';
  payment.metadata = {
    ...payment.metadata,
    providerPaymentId: paymentId,
    signature: signature || null,
    verificationStatus: payment.status,
    verifiedAt: new Date(),
    verifiedBy: req.user._id
  };

  await payment.save();

  res.status(200).json({
    status: 'success',
    data: { payment }
  });
});

exports.listJobPayments = catchAsync(async (req, res) => {
  const filter = { 'metadata.intent': 'job_posting' };

  if (req.query.intent) {
    filter['metadata.intent'] = req.query.intent;
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.employer) {
    filter.employer = req.query.employer;
  } else if (req.user.userType === 'employer') {
    filter.employer = req.user._id;
  }

  const payments = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .populate('employer', 'firstName lastName email userType');

  res.status(200).json({
    status: 'success',
    results: payments.length,
    data: payments
  });
});

exports.createPremiumOrder = catchAsync(async (req, res, next) => {
  const planType = req.body.planType || 'monthly';
  const amount = ensureAmount(req.body.amount ?? PREMIUM_PLAN_PRICING[planType]);

  if (!Object.prototype.hasOwnProperty.call(PREMIUM_PLAN_PRICING, planType)) {
    return next(new AppError('Unsupported premium plan type', 400));
  }

  if (amount !== PREMIUM_PLAN_PRICING[planType]) {
    return next(new AppError('Amount does not match selected plan', 400));
  }

  const currency = (req.body.currency || 'INR').toUpperCase();
  const receipt = req.body.receipt || `premium_${planType}_${Date.now()}`;
  const notes = {
    ...(req.body.notes || {}),
    planType,
    intent: 'premium_subscription',
    userId: req.user._id.toString()
  };

  const orderPayload = buildOrderPayload({
    amount,
    currency,
    receipt,
    notes
  });

  const order = await createOrder(orderPayload);

  const payment = await Payment.create({
    employer: req.user._id,
    amount: order.amount,
    currency: order.currency,
    description: 'Premium subscription purchase',
    status: 'pending',
    reference: order.id,
    metadata: {
      intent: 'premium_subscription',
      planType,
      provider: 'razorpay',
      notes,
      mock: !isRazorpayEnabled()
    }
  });

  res.status(201).json({
    status: 'success',
    data: {
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        notes: order.notes
      },
      paymentId: payment._id,
      razorpayKey: process.env.RAZORPAY_KEY_ID || null,
      mock: !isRazorpayEnabled()
    }
  });
});

exports.verifyPremiumPayment = catchAsync(async (req, res, next) => {
  const {
    orderId,
    paymentId,
    signature,
    planType,
    amount,
    status = 'completed',
    userId
  } = req.body;

  if (!orderId || !paymentId || !planType) {
    return next(new AppError('orderId, paymentId and planType are required', 400));
  }

  if (userId && userId !== req.user.id && userId !== req.user._id.toString()) {
    return next(new AppError('You cannot activate premium for another user', 403));
  }

  if (!Object.prototype.hasOwnProperty.call(PREMIUM_PLAN_PRICING, planType)) {
    return next(new AppError('Unsupported premium plan type', 400));
  }

  const expectedAmount = PREMIUM_PLAN_PRICING[planType];
  if (ensureAmount(amount) !== expectedAmount) {
    return next(new AppError('Amount does not match selected plan', 400));
  }

  if (isRazorpayEnabled() && signature) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      return next(new AppError('Invalid Razorpay signature', 400));
    }
  }

  const payment = await Payment.findOne({ reference: orderId });
  if (!payment) {
    return next(new AppError('Payment order not found', 404));
  }

  const now = new Date();
  const expiresAt = new Date(now);
  if (planType === 'monthly') {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  } else if (planType === 'yearly') {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  payment.status = status === 'failed' ? 'failed' : 'succeeded';
  payment.metadata = {
    ...payment.metadata,
    planType,
    providerPaymentId: paymentId,
    signature: signature || null,
    verificationStatus: payment.status,
    verifiedAt: now,
    expiresAt,
    verifiedBy: req.user._id
  };
  await payment.save();

  await User.updateOne({ _id: req.user._id }, { premium: payment.status === 'succeeded' });

  const subscription = await Subscription.findOneAndUpdate(
    { user: req.user._id },
    {
      plan: payment.status === 'succeeded' ? 'premium' : 'free',
      status: payment.status === 'succeeded' ? 'active' : 'canceled',
      renewsAt: payment.status === 'succeeded' ? expiresAt : null
    },
    { new: true, upsert: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      payment,
      subscription
    }
  });
});

exports.getPremiumStatus = catchAsync(async (req, res) => {
  const subscription = await Subscription.findOne({ user: req.user._id });
  const now = new Date();

  let isPremium = false;
  let renewsAt = null;
  let plan = 'free';

  if (subscription) {
    renewsAt = subscription.renewsAt || null;
    plan = subscription.plan;
    const active = subscription.status === 'active';
    const notExpired = !subscription.renewsAt || subscription.renewsAt > now;
    isPremium = active && notExpired && subscription.plan === 'premium';

    if (!notExpired && subscription.status === 'active') {
      subscription.status = 'canceled';
      await subscription.save();
    }
  }

  if (!isPremium && req.user.premium) {
    await User.updateOne({ _id: req.user._id }, { premium: false });
  }

  const latestPayment = await Payment.findOne({
    employer: req.user._id,
    'metadata.intent': 'premium_subscription'
  })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    status: 'success',
    data: {
      isPremium,
      plan,
      renewsAt,
      lastPayment: latestPayment
    }
  });
});
