const express = require('express');
const controller = require('./notification.controller');
const pushController = require('./notification.push.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

router.use(protect);
router.get('/', controller.listNotifications);
router.post('/', requirePermissions(['send_notifications']), controller.createNotification);
router.patch('/:notificationId/read', controller.markRead);

// Push notification endpoints
router.post('/register-token', pushController.registerFCMToken);
router.delete('/register-token', pushController.unregisterFCMToken);
router.post('/test', pushController.sendTestNotification);

module.exports = router;
