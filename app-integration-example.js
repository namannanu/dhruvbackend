// Add to your main app.js or server.js file

const premiumPaymentRoutes = require('./src/routes/premiumPayments');

// Mount the premium payment routes
app.use('/api/payments', premiumPaymentRoutes);

// Example environment variables you need to set:
/*
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_secret_key
*/

// Example middleware for protecting routes (if you don't have one):
/*
const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: 'Invalid token.',
    });
  }
};
*/