const express = require('express');
const controller = require('./notification.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

// Public userId routes (no auth required)
router.get('/user/:userId', controller.getNotificationsByUserId);

router.use(protect);
router.get('/', requirePermissions(['view_notifications']), controller.listNotifications);
router.post('/', requirePermissions(['send_notifications']), controller.createNotification);
router.patch('/:notificationId/read', requirePermissions(['view_notifications']), controller.markRead);

module.exports = router;
