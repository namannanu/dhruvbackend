const express = require('express');
const controller = require('./worker.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.get('/me', restrictTo('worker'), controller.getWorkerProfile);
router.get('/me/dashboard', restrictTo('worker'), controller.getWorkerDashboardMetrics);
router.patch('/me', restrictTo('worker'), controller.updateWorkerProfile);
router.post('/me/applications', restrictTo('worker'), controller.applyToJob);
router.patch('/me/applications/:applicationId/withdraw', restrictTo('worker'), controller.withdrawApplication);

router.get('/:workerId', controller.getWorkerProfile);
router.get('/:workerId/dashboard', controller.getWorkerDashboardMetrics);
router.patch('/:workerId', restrictTo('worker'), controller.updateWorkerProfile);
router.get('/:workerId/applications', controller.getWorkerApplications);
router.post('/:workerId/applications', restrictTo('worker'), controller.applyToJob);
router.patch('/:workerId/applications/:applicationId/withdraw', restrictTo('worker'), controller.withdrawApplication);
router.get('/:workerId/attendance', controller.getWorkerAttendance);
router.get('/:workerId/shifts', controller.getWorkerShifts);

module.exports = router;
