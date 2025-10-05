const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './src/config/config.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

const User = require('./src/modules/users/user.model');

async function generateTestTokens() {
  try {
    console.log('🔐 Generating JWT tokens for testing...');

    // Find the user we configured
    const user = await User.findOne({ email: 'b@example.com' }).select('+password');
    
    if (!user) {
      console.log('❌ User b@example.com not found');
      process.exit(1);
    }

    console.log('👤 Found user:', user.email);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        userType: user.userType,
        role: user.role || 'manager'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('\n🎉 JWT Token generated successfully!');
    console.log('\n📋 Copy this token for Postman:');
    console.log('='.repeat(80));
    console.log(token);
    console.log('='.repeat(80));

    console.log('\n📝 Postman Setup Instructions:');
    console.log('1. Open your Postman collection');
    console.log('2. Go to Variables tab');
    console.log('3. Set managerToken to the token above');
    console.log('4. Test "Create Business as Manager" request');

    console.log('\n🔧 User Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   User Type: ${user.userType}`);
    console.log(`   User ID: ${user._id}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateTestTokens();