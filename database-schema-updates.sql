// Add these fields to your User model/schema

// For MongoDB/Mongoose:
const userSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // Premium subscription fields
  isPremium: {
    type: Boolean,
    default: false,
  },
  premiumExpiresAt: {
    type: Date,
    default: null,
  },
  premiumPlan: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: null,
  },
  premiumPayments: [{
    orderId: String,
    paymentId: String,
    amount: Number,
    planType: String,
    activatedAt: Date,
    expiresAt: Date,
  }],
  
  // ... existing fields ...
});

// For SQL databases, add these columns:
/*
ALTER TABLE users ADD COLUMN isPremium BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN premiumExpiresAt DATETIME NULL;
ALTER TABLE users ADD COLUMN premiumPlan VARCHAR(20) NULL;

CREATE TABLE premium_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  order_id VARCHAR(255) NOT NULL,
  payment_id VARCHAR(255) NOT NULL,
  amount INT NOT NULL,
  plan_type VARCHAR(20) NOT NULL,
  activated_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
*/