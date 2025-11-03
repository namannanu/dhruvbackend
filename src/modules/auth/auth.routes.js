const express = require('express');
const controller = require('./auth.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.post('/signup', controller.signup);
router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/me', protect, controller.me);
router.get('/permissions', protect, controller.getUserPermissions);
router.get('/team-member', protect, controller.getUserTeamMemberInfo);
router.post('/refresh-token', controller.refreshToken);

module.exports = router;
