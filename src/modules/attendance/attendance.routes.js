const express = require('express');
const controller = require('./attendance.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.get('/', controller.listAttendance);
router.post('/', controller.scheduleAttendance);
router.post('/:recordId/clock-in', controller.clockIn);
router.post('/:recordId/clock-out', controller.clockOut);
router.patch('/:recordId', controller.updateAttendance);

module.exports = router;
