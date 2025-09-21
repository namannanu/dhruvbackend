const express = require('express');
const controller = require('./job.controller');
const applicationController = require('../applications/application.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.get('/', protect, controller.listJobs);
router.get('/:jobId', protect, controller.getJob);
router.get('/:jobId/applications', protect, controller.listApplicationsForJob);
router.post('/:jobId/applications', protect, applicationController.createApplication);
router.patch('/:jobId/status', protect, controller.updateJobStatus);
router.patch('/:jobId', protect, controller.updateJob);
router.post('/', protect, controller.createJob);
router.post('/bulk', protect, controller.createJobsBulk);
router.post('/applications/:applicationId/hire', protect, controller.hireApplicant);

module.exports = router;
