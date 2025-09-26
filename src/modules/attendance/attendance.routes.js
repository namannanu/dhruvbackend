const express = require('express');
const controller = require('./attendance.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

// Search and timeline routes (for employers mainly)
router.get('/search/workers', restrictTo('employer'), controller.searchWorkersByName);
router.get('/timeline/worker/:workerId', restrictTo('employer'), controller.getWorkerEmploymentTimeline);
router.get('/employed-on/:date', restrictTo('employer'), controller.getWorkersEmployedOnDate);

// Existing routes
router.get('/management', restrictTo('employer'), controller.getManagementView);
router.get('/', controller.listAttendance);
router.post('/', restrictTo('employer'), controller.scheduleAttendance);
router.post('/:recordId/clock-in', controller.clockIn);
router.post('/:recordId/clock-out', controller.clockOut);
router.post('/:recordId/mark-complete', restrictTo('employer'), controller.markComplete);
router.patch('/:recordId/hours', restrictTo('employer'), controller.updateHours);
router.patch('/:recordId', restrictTo('employer'), controller.updateAttendance);

module.exports = router;
