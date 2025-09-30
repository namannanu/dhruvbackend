const express = require('express');
const controller = require('./application.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router({ mergeParams: true });

router.use(protect);

// Application management routes with permission protection
router.get('/', requirePermissions('view_applications'), controller.listApplications);
router.get('/me', controller.listMyApplications); // Workers can see their own applications
router.patch('/:applicationId', requirePermissions('manage_applications'), controller.updateApplication);

module.exports = router;
