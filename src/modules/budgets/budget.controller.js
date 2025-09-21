const Budget = require('./budget.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');

exports.getBudget = catchAsync(async (req, res, next) => {
  const businessId = req.query.businessId;
  if (!businessId) {
    return next(new AppError('businessId query parameter is required', 400));
  }
  let budget = await Budget.findOne({ business: businessId });
  if (!budget) {
    budget = await Budget.create({ business: businessId, month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  }
  res.status(200).json({ status: 'success', data: budget });
});

exports.updateBudget = catchAsync(async (req, res, next) => {
  const businessId = req.body.business;
  if (!businessId) {
    return next(new AppError('business field is required', 400));
  }
  const budget = await Budget.findOneAndUpdate(
    { business: businessId },
    req.body,
    { upsert: true, new: true }
  );
  res.status(200).json({ status: 'success', data: budget });
});
