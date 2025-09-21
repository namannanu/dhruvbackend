const express = require('express');
const controller = require('./budget.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect, restrictTo('employer'));
router.get('/', controller.getBudget);
router.patch('/', controller.updateBudget);

module.exports = router;
