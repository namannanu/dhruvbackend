const express = require('express');
const controller = require('./application.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router({ mergeParams: true });

// Public id routes (no auth required)
router.get('/user/:id', controller.getApplicationsByUserId);

router.use(protect);

// Application management routes with permission protection
router.post('/', controller.createApplication);
router.get('/', requirePermissions('view_applications'), controller.listApplications);
router.get('/me', controller.listMyApplications); // Workers can see their own applications
router.patch('/:applicationId', requirePermissions('manage_applications'), controller.updateApplication);

module.exports = router;
