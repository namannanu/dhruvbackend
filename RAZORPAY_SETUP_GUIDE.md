# Razorpay Premium Plan Backend Integration Guide

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install razorpay
```

### 2. Environment Variables
Add to your `.env` file:
```env
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_secret_key_here
```

### 3. Database Updates
Run the SQL commands in `database-schema-updates.sql` or update your Mongoose schema.

### 4. Add Routes
In your main app file:
```javascript
const premiumPaymentRoutes = require('./src/routes/premiumPayments');
app.use('/api/payments', premiumPaymentRoutes);
```

## 📡 API Endpoints

### Create Premium Order
```
POST /api/payments/premium/order
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": 29900,
  "currency": "INR",
  "planType": "monthly",
  "receipt": "premium_monthly_1698769200000",
  "notes": {
    "plan_type": "monthly",
    "type": "premium_subscription",
    "user_id": "user_id_here"
  }
}
```

### Verify Premium Payment
```
POST /api/payments/premium/verify
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "orderId": "order_razorpay_order_id",
  "paymentId": "pay_razorpay_payment_id",
  "signature": "razorpay_signature",
  "planType": "monthly",
  "amount": 29900,
  "status": "completed",
  "userId": "user_id_here"
}
```

### Get Premium Status
```
GET /api/payments/premium/status
Authorization: Bearer <jwt_token>
```

## 🔐 Security Features

1. **Signature Verification**: Validates Razorpay webhook signature
2. **Amount Validation**: Ensures payment amount matches plan pricing
3. **User Authorization**: Users can only activate premium for themselves
4. **Expiry Checking**: Automatically deactivates expired premium subscriptions

## 💰 Pricing Configuration

Current pricing (modify in `premiumPaymentController.js`):
- Monthly: ₹299 (29900 paise)
- Yearly: ₹2999 (299900 paise)

## 🧪 Testing

### Test with Razorpay Test Mode
1. Use test API keys from Razorpay dashboard
2. Use test card numbers:
   - Success: 4111 1111 1111 1111
   - Failure: 4000 0000 0000 0002

### Frontend Testing
The Flutter app is already configured to work with these endpoints. Just ensure your backend is running and the endpoints are accessible.

## 📱 Frontend Integration Status

✅ **Already Implemented:**
- Premium plan screen with Razorpay payment gateway
- Application limit enforcement (2 for free, unlimited for premium)
- Dynamic UI based on premium status
- Payment success/failure handling
- Automatic profile refresh after payment

## 🔧 Additional Features You Can Add

1. **Webhook Handling**: For automatic payment status updates
2. **Plan Management**: Upgrade/downgrade between plans
3. **Payment History**: Track all premium payments
4. **Auto-renewal**: Subscription management
5. **Refund Handling**: Process refunds through Razorpay

## 🐛 Troubleshooting

1. **Invalid Signature**: Check RAZORPAY_KEY_SECRET
2. **Order Creation Failed**: Verify RAZORPAY_KEY_ID
3. **Database Errors**: Ensure schema is updated
4. **Auth Errors**: Check JWT token validation

## 📞 Support

- Razorpay Docs: https://razorpay.com/docs/
- Test Dashboard: https://dashboard.razorpay.com/signin
- Integration Checklist: https://razorpay.com/docs/payments/integration-checklist/