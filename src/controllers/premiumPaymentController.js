const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User'); // Adjust path to your User model

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Premium plan pricing
const PLAN_PRICING = {
  monthly: 29900, // ₹299 in paise
  yearly: 299900, // ₹2999 in paise
};

/**
 * Create Razorpay order for premium plan
 */
exports.createPremiumOrder = async (req, res) => {
  try {
    const { amount, currency, planType, receipt, notes } = req.body;
    const userId = req.user.id; // From authentication middleware

    // Validate plan type and amount
    if (!PLAN_PRICING[planType] || PLAN_PRICING[planType] !== amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid plan type or amount',
      });
    }

    // Create Razorpay order
    const options = {
      amount: amount,
      currency: currency || 'INR',
      receipt: receipt,
      notes: {
        ...notes,
        user_id: userId,
        plan_type: planType,
      },
    };

    const order = await razorpay.orders.create(options);

    res.status(201).json({
      status: 'success',
      data: {
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
        },
      },
    });
  } catch (error) {
    console.error('Error creating premium order:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create premium order',
      error: error.message,
    });
  }
};

/**
 * Verify premium plan payment and activate premium
 */
exports.verifyPremiumPayment = async (req, res) => {
  try {
    const {
      orderId,
      paymentId,
      signature,
      planType,
      amount,
      status,
      userId,
    } = req.body;

    const currentUserId = req.user.id; // From authentication middleware

    // Ensure user can only activate premium for themselves
    if (userId !== currentUserId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to activate premium for another user',
      });
    }

    // Verify Razorpay signature
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid payment signature',
      });
    }

    // Validate plan type and amount
    if (!PLAN_PRICING[planType] || PLAN_PRICING[planType] !== amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid plan type or amount',
      });
    }

    // Calculate premium expiry date
    const now = new Date();
    const expiryDate = new Date(now);
    
    if (planType === 'monthly') {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (planType === 'yearly') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    // Update user premium status
    const user = await User.findByIdAndUpdate(
      currentUserId,
      {
        isPremium: true,
        premiumExpiresAt: expiryDate,
        premiumPlan: planType,
        $push: {
          premiumPayments: {
            orderId,
            paymentId,
            amount,
            planType,
            activatedAt: now,
            expiresAt: expiryDate,
          },
        },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Premium plan activated successfully',
      data: {
        user: {
          isPremium: user.isPremium,
          premiumExpiresAt: user.premiumExpiresAt,
          premiumPlan: user.premiumPlan,
        },
      },
    });
  } catch (error) {
    console.error('Error verifying premium payment:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify premium payment',
      error: error.message,
    });
  }
};

/**
 * Get user's premium status
 */
exports.getPremiumStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('isPremium premiumExpiresAt premiumPlan');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Check if premium has expired
    const now = new Date();
    if (user.isPremium && user.premiumExpiresAt && user.premiumExpiresAt < now) {
      // Premium has expired, update user
      await User.findByIdAndUpdate(userId, {
        isPremium: false,
        premiumPlan: null,
      });

      return res.json({
        status: 'success',
        data: {
          isPremium: false,
          premiumExpiresAt: null,
          premiumPlan: null,
        },
      });
    }

    res.json({
      status: 'success',
      data: {
        isPremium: user.isPremium,
        premiumExpiresAt: user.premiumExpiresAt,
        premiumPlan: user.premiumPlan,
      },
    });
  } catch (error) {
    console.error('Error getting premium status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get premium status',
      error: error.message,
    });
  }
};