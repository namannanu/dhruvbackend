const express = require('express');
const controller = require('./notification.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.get('/', controller.listNotifications);
router.post('/', controller.createNotification);
router.patch('/:notificationId/read', controller.markRead);

module.exports = router;
