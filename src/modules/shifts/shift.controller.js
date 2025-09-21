const Shift = require('./shift.model');
const SwapRequest = require('./swapRequest.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');

exports.listShifts = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.workerId) {
    filter.worker = req.query.workerId;
  }
  if (req.query.businessId) {
    filter.business = req.query.businessId;
  }
  const shifts = await Shift.find(filter).sort({ scheduledStart: 1 });
  res.status(200).json({ status: 'success', data: shifts });
});

exports.requestSwap = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'worker') {
    return next(new AppError('Only workers can request a swap', 403));
  }
  const shift = await Shift.findById(req.body.shiftId);
  if (!shift || shift.worker.toString() !== req.user._id.toString()) {
    return next(new AppError('Shift not found or not owned by you', 404));
  }
  if (!shift.canSwap) {
    return next(new AppError('This shift cannot be swapped', 400));
  }
  const pending = await SwapRequest.findOne({ shift: shift._id, status: 'pending' });
  if (pending) {
    return next(new AppError('A pending swap already exists for this shift', 400));
  }

  const swap = await SwapRequest.create({
    shift: shift._id,
    fromWorker: req.user._id,
    toWorker: req.body.toWorkerId,
    message: req.body.message || '',
    requestedFor: req.body.requestedFor
  });
  shift.status = 'swap_requested';
  await shift.save();
  res.status(201).json({ status: 'success', data: swap });
});

exports.updateSwap = catchAsync(async (req, res, next) => {
  const swap = await SwapRequest.findById(req.params.swapId).populate('shift');
  if (!swap) {
    return next(new AppError('Swap request not found', 404));
  }
  if (
    req.user.userType !== 'worker' ||
    (swap.toWorker.toString() !== req.user._id.toString() &&
      swap.fromWorker.toString() !== req.user._id.toString())
  ) {
    return next(new AppError('Only involved workers can update swap status', 403));
  }
  if (!['pending', 'approved', 'rejected'].includes(req.body.status)) {
    return next(new AppError('Invalid status', 400));
  }
  swap.status = req.body.status;
  swap.messages.push({ sender: req.user._id, body: req.body.message || '' });
  await swap.save();

  if (req.body.status === 'approved') {
    swap.shift.status = 'swapped';
    swap.shift.worker = swap.toWorker;
    await swap.shift.save();
  }
  if (req.body.status === 'rejected') {
    swap.shift.status = 'assigned';
    await swap.shift.save();
  }

  res.status(200).json({ status: 'success', data: swap });
});

exports.listSwaps = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.workerId) {
    filter.$or = [{ fromWorker: req.query.workerId }, { toWorker: req.query.workerId }];
  }
  const swaps = await SwapRequest.find(filter).populate('shift').sort({ createdAt: -1 });
  res.status(200).json({ status: 'success', data: swaps });
});
