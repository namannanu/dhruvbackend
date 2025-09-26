const express = require('express');
const controller = require('./attendance.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.get('/management', restrictTo('employer'), controller.getManagementView);
router.get('/', controller.listAttendance);
router.post('/', restrictTo('employer'), controller.scheduleAttendance);
router.post('/:recordId/clock-in', controller.clockIn);
router.post('/:recordId/clock-out', controller.clockOut);
router.post('/:recordId/mark-complete', restrictTo('employer'), controller.markComplete);
router.patch('/:recordId/hours', restrictTo('employer'), controller.updateHours);
router.patch('/:recordId', restrictTo('employer'), controller.updateAttendance);

module.exports = router;
