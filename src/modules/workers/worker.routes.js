const express = require('express');
const multer = require('multer');
const controller = require('./worker.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');
const applicationController = require('../applications/application.controller');
const AppError = require('../../shared/utils/appError');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new AppError('Only image files are allowed', 400));
    }
    cb(null, true);
  }
});

router.use(protect);
router.get('/me', restrictTo('worker'), controller.getWorkerProfile);
router.get('/me/dashboard', restrictTo('worker'), controller.getWorkerDashboardMetrics);
router.patch('/me', restrictTo('worker'), controller.updateWorkerProfile);

// Profile picture routes
router.post('/me/profile-picture', restrictTo('worker'), upload.single('profilePicture'), controller.uploadProfilePicture);
router.get('/me/profile-picture', restrictTo('worker'), controller.getProfilePicture);

// Employment tracking routes
router.get('/me/employment/history', restrictTo('worker'), controller.getMyEmploymentHistory);
router.get('/me/employment/current', restrictTo('worker'), controller.getCurrentEmployment);
router.get('/me/employment/scheduled-dates', restrictTo('worker'), controller.getMyScheduledDates);
router.patch('/me/employment/end', restrictTo('worker'), controller.endMyEmployment);

// Worker applications route
router.post('/me/applications', restrictTo('worker'), applicationController.createApplication);
router.get('/me/applications', restrictTo('worker'), controller.getWorkerApplications);

router.get('/:workerId', controller.getWorkerProfile);
router.get('/:workerId/dashboard', controller.getWorkerDashboardMetrics);
router.patch('/:workerId', restrictTo('worker'), controller.updateWorkerProfile);
router.get('/:workerId/profile-picture', controller.getProfilePicture);
router.get('/:workerId/applications', controller.getWorkerApplications);
router.get('/:workerId/attendance', controller.getWorkerAttendance);
router.get('/:workerId/shifts', controller.getWorkerShifts);

module.exports = router;

