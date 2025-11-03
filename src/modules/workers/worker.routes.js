const express = require('express');
const controller = require('./worker.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.get('/me', restrictTo('worker'), controller.getWorkerProfile);
router.patch('/me', restrictTo('worker'), controller.updateWorkerProfile);

router.get('/:workerId', controller.getWorkerProfile);
router.patch('/:workerId', restrictTo('worker'), controller.updateWorkerProfile);
router.get('/:workerId/applications', controller.getWorkerApplications);
router.get('/:workerId/attendance', controller.getWorkerAttendance);
router.get('/:workerId/shifts', controller.getWorkerShifts);

module.exports = router;
