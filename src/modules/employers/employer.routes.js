const express = require('express');
const controller = require('./employer.controller');
const applicationController = require('../applications/application.controller');
const jobController = require('../jobs/job.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect, restrictTo('employer'));

router.get('/me/applications', controller.listEmployerApplications);
router.patch('/me/applications/:applicationId', applicationController.updateApplication);
router.post('/me/applications/:applicationId/hire', jobController.hireApplicant);

router.get('/me', controller.getEmployerProfile);
router.patch('/me', controller.updateEmployerProfile);
router.get('/me/dashboard', controller.getDashboard);
router.get('/me/analytics', controller.getAnalytics);

// Employment management routes
router.get('/me/workers', controller.getMyWorkers);
router.get('/me/workers/:workerId/employment', controller.getWorkerEmploymentHistory);
router.get('/me/workers/scheduled-dates', controller.getWorkersScheduledDates);
router.patch('/me/workers/:workerId/terminate', controller.terminateWorker);

router.get('/:employerId/applications', controller.listEmployerApplications);
router.patch('/:employerId/applications/:applicationId', applicationController.updateApplication);
router.post('/:employerId/applications/:applicationId/hire', jobController.hireApplicant);

router.get('/:employerId', controller.getEmployerProfile);
router.patch('/:employerId', controller.updateEmployerProfile);
router.get('/:employerId/dashboard', controller.getDashboard);
router.get('/:employerId/analytics', controller.getAnalytics);

module.exports = router;
