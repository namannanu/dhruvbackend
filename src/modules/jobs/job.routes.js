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

// Static routes must come before dynamic routes
router.get('/list/worker', protect, controller.listJobsForWorker);
router.get('/list/employer', protect, requirePermissions('view_jobs'), controller.listJobsForEmployer);

// Job application and bulk operations
router.post('/bulk/create', protect, requirePermissions('create_jobs'), controller.createJobsBulk);
router.post('/applications/:applicationId/hire', protect, requirePermissions('hire_workers'), controller.hireApplicant);

// Job CRUD operations
router.get('/', protect, ensureViewJobsPermission, controller.listJobs);
router.post('/', protect, requirePermissions('create_jobs'), controller.createJob);

// Job specific operations with ID
router.get('/:jobId', protect, requirePermissions('view_jobs'), controller.getJob);
router.patch('/:jobId', protect, requirePermissions('edit_jobs'), controller.updateJob);
router.patch('/:jobId/status', protect, requirePermissions('edit_jobs'), controller.updateJobStatus);
router.get('/:jobId/applications', protect, requirePermissions('view_applications'), controller.listApplicationsForJob);
router.post('/:jobId/applications', protect, applicationController.createApplication);
router.get('/:jobId/applications', protect, requirePermissions('view_applications'), controller.listApplicationsForJob);
router.post('/:jobId/applications', protect, applicationController.createApplication); // Workers can apply without special permission
router.patch('/:jobId/status', protect, requirePermissions('edit_jobs'), controller.updateJobStatus);
router.patch('/:jobId', protect, requirePermissions('edit_jobs'), controller.updateJob);
router.post('/', protect, requirePermissions('create_jobs'), controller.createJob);
router.post('/bulk', protect, requirePermissions('create_jobs'), controller.createJobsBulk);
router.post('/applications/:applicationId/hire', protect, requirePermissions('hire_workers'), controller.hireApplicant);

module.exports = router;