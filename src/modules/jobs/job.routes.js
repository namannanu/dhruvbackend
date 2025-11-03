const express = require('express');
const controller = require('./job.controller');
const applicationController = require('../applications/application.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();
const ensureViewJobsPermission = (req, res, next) => {
  if (req.user?.userType === 'worker') {
    return next();
  }
  return requirePermissions('view_jobs')(req, res, next);
};

// Define a separate router for job-specific routes to avoid parameter conflicts
const jobSpecificRouter = express.Router();

// Worker and employer specific routes (must be before any routes with parameters)
router.get('/by-worker', protect, controller.listJobsForWorker);
router.get('/by-employer', protect, requirePermissions('view_jobs'), controller.listJobsForEmployer);

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