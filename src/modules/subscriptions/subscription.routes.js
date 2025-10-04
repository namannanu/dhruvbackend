const express = require('express');
const controller = require('./subscription.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

// Public userId routes (no auth required)
router.get('/user/:userId', controller.getSubscriptionByUserId);

router.use(protect);
router.get('/me', requirePermissions(['manage_subscriptions']), controller.getMySubscription);
router.post('/upgrade', requirePermissions(['manage_subscriptions']), controller.upgrade);

module.exports = router;
