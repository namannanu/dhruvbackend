const express = require('express');
const controller = require('./payment.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

router.use(protect);
router.post(
  '/job-posting',
  requirePermissions(['manage_payments']),
  controller.processJobPayment
);

router.post(
  '/razorpay/order',
  requirePermissions(['manage_payments']),
  controller.createRazorpayOrder
);

router.post(
  '/verify',
  requirePermissions(['manage_payments']),
  controller.verifyRazorpayPayment
);

module.exports = router;
