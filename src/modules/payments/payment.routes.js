const express = require('express');
const controller = require('./payment.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect, restrictTo('employer'));
router.post('/job-posting', controller.processJobPayment);

module.exports = router;
