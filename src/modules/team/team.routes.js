const express = require('express');
const controller = require('./team.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');

const router = express.Router({ mergeParams: true });

router.use(protect);

router.post('/grant-access', restrictTo('employer'), controller.grantAccess);
router.get('/my-team', restrictTo('employer'), controller.listMyTeam);
router.get('/my-access', controller.listMyAccess);
router.get('/check-access/:userId', controller.checkAccess);
router.get('/check-access-by-email/:email', controller.checkAccessByEmail);
router.patch('/access/:identifier', restrictTo('employer'), controller.updateAccess);
router.delete('/access/:identifier', restrictTo('employer'), controller.revokeAccess);

module.exports = router;
