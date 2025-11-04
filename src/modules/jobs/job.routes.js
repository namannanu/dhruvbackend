// job.routes.js
const express = require('express');
const controller = require('./job.controller');
const applicationController = require('../applications/application.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

// Workers can list publicly published jobs without extra perms;
// Employers/team must have view_jobs to read employer views
const ensureViewJobs = (req, res, next) => {
  if (req.user?.userType === 'worker') return next();
  return requirePermissions('view_jobs')(req, res, next);
};

// Worker view
router.get('/worker', protect, controller.listJobsForWorker);

// Employer view
router.get('/employer', protect, requirePermissions('view_jobs'), controller.listJobsForEmployer);

// CRUD
router.get('/', protect, controller.listJobsForEmployer); // optional: default employer list
router.post('/', protect, controller.createJob);

const idRe = '[0-9a-fA-F]{24}';
router.get(`/:jobId(${idRe})`, protect, ensureViewJobs, controller.getJob);
router.patch(`/:jobId(${idRe})`, protect, requirePermissions('edit_jobs'), controller.updateJob);

// Applications (keep just the essentials you need)
router.post(`/:jobId(${idRe})/applications`, protect, applicationController.createApplication);



// Application hire route (specific enough to not conflict)
router.post('/applications/:applicationId/hire', protect, requirePermissions('hire_workers'), controller.hireApplicant);


module.exports = router;
