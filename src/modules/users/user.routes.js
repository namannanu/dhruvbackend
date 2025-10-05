const express = require('express');
const controller = require('./user.controller');
const userdataController = require('./userdata.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

// Public userId routes (no auth required)
router.get('/id/:id', userdataController.getUserByUserId);
router.get('/id/:id/all-data', userdataController.getAllUserDataByUserId);

router.use(protect);
router.get('/', controller.listUsers);
router.get('/me', controller.getMe);
router.patch('/me', controller.updateMe);
router.get('/:id', controller.getUser);

module.exports = router;
