const express = require('express');
const controller = require('./employer.controller');
const applicationController = require('../applications/application.controller');
const jobController = require('../jobs/job.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

router.use(protect);

router.get('/me/applications', requirePermissions(['view_applications']), controller.listEmployerApplications);
router.patch('/me/applications/:applicationId', requirePermissions(['manage_applications']), applicationController.updateApplication);
router.post('/me/applications/:applicationId/hire', requirePermissions(['hire_workers']), jobController.hireApplicant);

router.get('/me', requirePermissions(['view_business_profile']), controller.getEmployerProfile);
router.patch('/me', requirePermissions(['edit_business_profile']), controller.updateEmployerProfile);
router.get('/me/dashboard', requirePermissions(['view_dashboard']), controller.getDashboard);
router.get('/me/analytics', requirePermissions(['view_analytics']), controller.getAnalytics);

// Job management routes
router.get('/me/jobs', requirePermissions(['view_jobs']), jobController.listJobs);
router.post('/me/jobs', requirePermissions(['create_jobs']), jobController.createJob);
router.patch('/me/jobs/:jobId', requirePermissions(['edit_jobs']), jobController.updateJob);
router.patch('/me/jobs/:jobId/status', requirePermissions(['edit_jobs']), jobController.updateJobStatus);
router.get('/me/jobs/:jobId', requirePermissions(['view_jobs']), jobController.getJob);
router.get('/me/jobs/:jobId/applications', requirePermissions(['view_applications']), jobController.listApplicationsForJob);

// Employment management routes
router.get('/me/workers', requirePermissions(['view_team_members']), controller.getMyWorkers);
router.get('/me/workers/:workerId/employment', requirePermissions(['view_team_members']), controller.getWorkerEmploymentHistory);
router.patch(
  '/me/workers/:workerId/employment/:employmentId/work-location',
  requirePermissions(['manage_team_members']),
  controller.updateEmploymentWorkLocation
);
router.get('/me/workers/scheduled-dates', requirePermissions(['view_schedules']), controller.getWorkersScheduledDates);
router.patch('/me/workers/:workerId/terminate', requirePermissions(['manage_team_members']), controller.terminateWorker);

router.get('/:employerId/applications', requirePermissions(['view_applications']), controller.listEmployerApplications);
router.patch('/:employerId/applications/:applicationId', requirePermissions(['manage_applications']), applicationController.updateApplication);
router.post('/:employerId/applications/:applicationId/hire', requirePermissions(['hire_workers']), jobController.hireApplicant);

router.get('/:employerId', requirePermissions(['view_business_profile']), controller.getEmployerProfile);
router.patch('/:employerId', requirePermissions(['edit_business_profile']), controller.updateEmployerProfile);
router.get('/:employerId/dashboard', requirePermissions(['view_dashboard']), controller.getDashboard);
router.get('/:employerId/analytics', requirePermissions(['view_analytics']), controller.getAnalytics);

// Job management routes for specific employer
router.get('/:employerId/jobs', requirePermissions(['view_jobs']), jobController.listJobs);
router.patch('/:employerId/jobs/:jobId', requirePermissions(['edit_jobs']), jobController.updateJob);
router.patch('/:employerId/jobs/:jobId/status', requirePermissions(['edit_jobs']), jobController.updateJobStatus);
router.get('/:employerId/jobs/:jobId', requirePermissions(['view_jobs']), jobController.getJob);
router.get('/:employerId/jobs/:jobId/applications', requirePermissions(['view_applications']), jobController.listApplicationsForJob);

module.exports = router;
