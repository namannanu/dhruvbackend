const express = require('express');
const router = express.Router();
const premiumPaymentController = require('../controllers/premiumPaymentController');
const authMiddleware = require('../middleware/auth'); // Adjust path to your auth middleware

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Premium payment routes
router.post('/premium/order', premiumPaymentController.createPremiumOrder);
router.post('/premium/verify', premiumPaymentController.verifyPremiumPayment);
router.get('/premium/status', premiumPaymentController.getPremiumStatus);

module.exports = router;