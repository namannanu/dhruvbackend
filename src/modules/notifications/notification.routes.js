const express = require('express');
const controller = require('./notification.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

router.use(protect);
router.get('/', controller.listNotifications);
router.post('/', requirePermissions(['send_notifications']), controller.createNotification);
router.patch('/:notificationId/read', controller.markRead);

module.exports = router;
