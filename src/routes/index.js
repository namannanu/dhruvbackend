const express = require('express');

const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/users/user.routes');
const workerRoutes = require('../modules/workers/worker.routes');
const employerRoutes = require('../modules/employers/employer.routes');
const businessRoutes = require('../modules/businesses/business.routes');
const jobRoutes = require('../modules/jobs/job.routes');
const applicationRoutes = require('../modules/applications/application.routes');
const attendanceRoutes = require('../modules/attendance/attendance.routes');
const shiftRoutes = require('../modules/shifts/shift.routes');
const notificationRoutes = require('../modules/notifications/notification.routes');
const conversationRoutes = require('../modules/conversations/conversation.routes');
const budgetRoutes = require('../modules/budgets/budget.routes');
const paymentRoutes = require('../modules/payments/payment.routes');
const subscriptionRoutes = require('../modules/subscriptions/subscription.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/workers', workerRoutes);
router.use('/employers', employerRoutes);
router.use('/businesses', businessRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/shift-swaps', shiftRoutes);
router.use('/notifications', notificationRoutes);
router.use('/conversations', conversationRoutes);
router.use('/budget', budgetRoutes);
router.use('/payments', paymentRoutes);
router.use('/subscriptions', subscriptionRoutes);

module.exports = router;
