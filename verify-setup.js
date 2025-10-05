const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './src/config/config.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

const User = require('./src/modules/users/user.model');
const TeamAccess = require('./src/modules/team/teamAccess.model');

async function finalVerification() {
  try {
    console.log('🎯 Final verification of business creation setup...');

    // Get the test user
    const user = await User.findOne({ email: 'b@example.com' });
    if (!user) {
      console.log('❌ Test user not found');
      process.exit(1);
    }

    // Verify TeamAccess
    const teamAccess = await TeamAccess.findOne({ userEmail: user.email });
    if (!teamAccess || !teamAccess.permissions.canCreateBusiness) {
      console.log('❌ TeamAccess not properly configured');
      process.exit(1);
    }

    // Generate fresh JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        userType: user.userType,
        role: 'manager'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ All checks passed!');
    console.log('\n📋 Setup Summary:');
    console.log(`   User Email: ${user.email}`);
    console.log(`   User ID: ${user._id}`);
    console.log(`   Access Level: ${teamAccess.accessLevel}`);
    console.log(`   Can Create Business: ${teamAccess.permissions.canCreateBusiness}`);

    console.log('\n🔑 JWT Token for Postman:');
    console.log('='.repeat(80));
    console.log(token);
    console.log('='.repeat(80));

    console.log('\n🚀 Ready to test!');
    console.log('1. Copy the token above');
    console.log('2. Set it as {{managerToken}} in Postman');
    console.log('3. Test "Create Business as Manager" request');
    console.log('4. Should get 201 Created response');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

finalVerification();