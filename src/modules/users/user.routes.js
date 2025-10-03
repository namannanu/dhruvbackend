const express = require('express');
const controller = require('./user.controller');
const userdataController = require('./userdata.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

// Public userId routes (no auth required)
router.get('/userId/:userId', userdataController.getUserByUserId);
router.get('/userId/:userId/all-data', userdataController.getAllUserDataByUserId);

router.use(protect);
router.get('/', controller.listUsers);
router.get('/me', controller.getMe);
router.patch('/me', controller.updateMe);
router.get('/:userId', controller.getUser);

module.exports = router;
