const express = require('express');
const controller = require('./employer.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect, restrictTo('employer'));

router.get('/me', controller.getEmployerProfile);
router.patch('/me', controller.updateEmployerProfile);
router.get('/me/dashboard', controller.getDashboard);
router.get('/me/analytics', controller.getAnalytics);

router.get('/:employerId', controller.getEmployerProfile);
router.patch('/:employerId', controller.updateEmployerProfile);
router.get('/:employerId/dashboard', controller.getDashboard);
router.get('/:employerId/analytics', controller.getAnalytics);

module.exports = router;
