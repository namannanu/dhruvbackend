const express = require('express');
const controller = require('./job.controller');
const applicationController = require('../applications/application.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

// Permission middleware
const ensureViewJobsPermission = (req, res, next) => {
  if (req.user?.userType === 'worker') {
    return next();
  }
  return requirePermissions('view_jobs')(req, res, next);
};

// Dedicated list endpoints
router.get('/list/worker', protect, controller.listJobsForWorker);
router.get('/list/employer', protect, requirePermissions('view_jobs'), controller.listJobsForEmployer);

// Bulk operations (no parameters, so safe to be here)
router.post('/bulk', protect, requirePermissions('create_jobs'), controller.createJobsBulk);

// Basic routes (no parameters)
router.get('/', protect, ensureViewJobsPermission, controller.listJobs);
router.post('/', protect, requirePermissions('create_jobs'), controller.createJob);

// Application hire route (specific enough to not conflict)
router.post('/applications/:applicationId/hire', protect, requirePermissions('hire_workers'), controller.hireApplicant);

// All job-specific routes with :jobId parameter
router.get('/:jobId', protect, requirePermissions('view_jobs'), controller.getJob);
router.patch('/:jobId', protect, requirePermissions('edit_jobs'), controller.updateJob);
router.patch('/:jobId/status', protect, requirePermissions('edit_jobs'), controller.updateJobStatus);
router.get('/:jobId/applications', protect, requirePermissions('view_applications'), controller.listApplicationsForJob);
router.post('/:jobId/applications', protect, applicationController.createApplication);

module.exports = router;
