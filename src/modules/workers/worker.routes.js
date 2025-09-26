const express = require('express');
const controller = require('./worker.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.get('/me', restrictTo('worker'), controller.getWorkerProfile);
router.get('/me/dashboard', restrictTo('worker'), controller.getWorkerDashboardMetrics);
router.patch('/me', restrictTo('worker'), controller.updateWorkerProfile);

// Employment tracking routes
router.get('/me/employment/history', restrictTo('worker'), controller.getMyEmploymentHistory);
router.get('/me/employment/current', restrictTo('worker'), controller.getCurrentEmployment);
router.get('/me/employment/scheduled-dates', restrictTo('worker'), controller.getMyScheduledDates);
router.patch('/me/employment/end', restrictTo('worker'), controller.endMyEmployment);

router.get('/:workerId', controller.getWorkerProfile);
router.get('/:workerId/dashboard', controller.getWorkerDashboardMetrics);
router.patch('/:workerId', restrictTo('worker'), controller.updateWorkerProfile);
router.get('/:workerId/applications', controller.getWorkerApplications);
router.get('/:workerId/attendance', controller.getWorkerAttendance);
router.get('/:workerId/shifts', controller.getWorkerShifts);

module.exports = router;


