const express = require('express');
const controller = require('./attendance.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

router.use(protect);

// Search and timeline routes (for employers mainly) - permission protected
router.get('/search/workers', requirePermissions('view_attendance'), controller.searchWorkersByName);
router.get('/timeline/worker/:workerId', requirePermissions('view_attendance'), controller.getWorkerEmploymentTimeline);
router.get('/employed-on/:date', requirePermissions('view_attendance'), controller.getWorkersEmployedOnDate);

// Attendance management routes with permission protection
router.get('/management', requirePermissions('view_attendance'), controller.getManagementView);
router.get('/', requirePermissions('view_attendance'), controller.listAttendance);
router.post('/', requirePermissions('create_schedules'), controller.scheduleAttendance);
router.post('/:recordId/clock-in', controller.clockIn); // Workers can clock in without special permission
router.post('/:recordId/clock-out', controller.clockOut); // Workers can clock out without special permission
router.post('/:recordId/mark-complete', requirePermissions('approve_attendance'), controller.markComplete);
router.patch('/:recordId/hours', requirePermissions('manage_attendance'), controller.updateHours);
router.patch('/:recordId', requirePermissions('manage_attendance'), controller.updateAttendance);

module.exports = router;
