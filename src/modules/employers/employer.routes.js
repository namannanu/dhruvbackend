const express = require('express');
const controller = require('./employer.controller');
const applicationController = require('../applications/application.controller');
const jobController = require('../jobs/job.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

// Permission checks removed per user request
router.get('/me/applications', controller.listEmployerApplications);
router.patch('/me/applications/:applicationId', applicationController.updateApplication);
router.post('/me/applications/:applicationId/hire', jobController.hireApplicant);

router.get('/me', controller.getEmployerProfile);
router.patch('/me', controller.updateEmployerProfile);
router.get('/me/dashboard', controller.getDashboard);
router.get('/me/analytics', controller.getAnalytics);

// Job management routes
router.get('/me/jobs', jobController.listJobs);
router.post('/me/jobs', jobController.createJob);
router.patch('/me/jobs/:jobId', jobController.updateJob);
router.patch('/me/jobs/:jobId/status', jobController.updateJobStatus);
router.get('/me/jobs/:jobId', jobController.getJob);
router.get('/me/jobs/:jobId/applications', jobController.listApplicationsForJob);

// Employment management routes
router.get('/me/workers', controller.getMyWorkers);
router.get('/me/workers/:workerId/employment', controller.getWorkerEmploymentHistory);
router.patch(
  '/me/workers/:workerId/employment/:employmentId/work-location',
  controller.updateEmploymentWorkLocation
);
router.get('/me/workers/scheduled-dates', controller.getWorkersScheduledDates);
router.patch('/me/workers/:workerId/terminate', controller.terminateWorker);

router.get('/:employerId/applications', controller.listEmployerApplications);
router.patch('/:employerId/applications/:applicationId', applicationController.updateApplication);
router.post('/:employerId/applications/:applicationId/hire', jobController.hireApplicant);

router.get('/:employerId', controller.getEmployerProfile);
router.patch('/:employerId', controller.updateEmployerProfile);
router.get('/:employerId/dashboard', controller.getDashboard);
router.get('/:employerId/analytics', controller.getAnalytics);

// Job management routes for specific employer
router.get('/:employerId/jobs', jobController.listJobs);
router.patch('/:employerId/jobs/:jobId', jobController.updateJob);
router.patch('/:employerId/jobs/:jobId/status', jobController.updateJobStatus);
router.get('/:employerId/jobs/:jobId', jobController.getJob);
router.get('/:employerId/jobs/:jobId/applications', jobController.listApplicationsForJob);

module.exports = router;
