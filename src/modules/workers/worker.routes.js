const express = require('express');
const controller = require('./worker.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

// Debug logging
console.log('Worker Controller functions:', Object.keys(controller));
console.log('Auth middleware:', { protect: typeof protect, restrictTo: typeof restrictTo });

router.use(protect);
router.get('/me', restrictTo('worker'), controller.getWorkerProfile);
router.get('/me/dashboard', restrictTo('worker'), controller.getWorkerDashboardMetrics);
router.patch('/me', restrictTo('worker'), controller.updateWorkerProfile);

router.get('/:workerId', controller.getWorkerProfile);
router.get('/:workerId/dashboard', controller.getWorkerDashboardMetrics);
router.patch('/:workerId', restrictTo('worker'), controller.updateWorkerProfile);
router.get('/:workerId/applications', controller.getWorkerApplications);
router.get('/:workerId/attendance', controller.getWorkerAttendance);
router.get('/:workerId/attendance/schedule', controller.getWorkerAttendanceSchedule);
router.get('/:workerId/shifts', controller.getWorkerShifts);

module.exports = router;


