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
  // For employers, check view_jobs permission without requiring business ID for listing
  return requirePermissions('view_jobs', { requireBusinessId: false })(req, res, next);
};

const ensureViewJobDetailsPermission = (req, res, next) => {
  if (req.user?.userType === 'worker') {
    return next(); // Workers can view job details without permission checks
  }
  // For employers, check view_jobs permission
  return requirePermissions('view_jobs')(req, res, next);
};

// Job management routes with permission protection
router.get('/access-context', protect, controller.getJobAccessContext);
router.get('/', protect, ensureViewJobsPermission, controller.listJobs);
router.get('/user/:id', controller.getJobsByUserId); // Public endpoint for id access
router.get('/:jobId', protect, ensureViewJobDetailsPermission, controller.getJob);
router.get('/:jobId/applications', protect, requirePermissions('view_applications'), controller.listApplicationsForJob);
router.post('/:jobId/applications', protect, applicationController.createApplication); // Workers can apply without special permission
router.patch('/:jobId/status', protect, requirePermissions('edit_jobs'), controller.updateJobStatus);
router.patch('/:jobId', protect, requirePermissions('edit_jobs'), controller.updateJob);
router.post('/', protect, requirePermissions('create_jobs'), controller.createJob);
router.post('/bulk', protect, requirePermissions('create_jobs'), controller.createJobsBulk);
router.post('/applications/:applicationId/hire', protect, requirePermissions('hire_workers'), controller.hireApplicant);

module.exports = router;