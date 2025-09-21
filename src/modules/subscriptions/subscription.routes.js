const express = require('express');
const controller = require('./subscription.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.get('/me', controller.getMySubscription);
router.post('/upgrade', controller.upgrade);

module.exports = router;
