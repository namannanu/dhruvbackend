const express = require('express');
const controller = require('./budget.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

router.use(protect);
router.get('/', requirePermissions(['view_budget']), controller.getBudget);
router.patch('/', requirePermissions(['manage_budget']), controller.updateBudget);

module.exports = router;
