const express = require('express');
const controller = require('./workerFeedback.controller');
const {
  protect,
  restrictTo,
} = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/', restrictTo('worker'), controller.createFeedback);
router.get('/worker', restrictTo('worker'), controller.listWorkerFeedback);
router.get('/employer', restrictTo('employer'), controller.listEmployerFeedback);

module.exports = router;
