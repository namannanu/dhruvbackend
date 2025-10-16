const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

async function testUserPassword() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected successfully');

    const User = require('./src/modules/users/user.model');
    const bcrypt = require('bcryptjs');
    
    // Try to find any user and check their password structure
    const users = await User.find({}).select('email password').limit(5);
    
    console.log(`👥 Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} - Has password: ${!!user.password}`);
    });

    // Try to create a test user with known password if none exist
    console.log('\n🔧 Creating test user with known password...');
    
    try {
      const testUser = await User.create({
        email: 'test-team-access@example.com',
        password: 'password123',
        userType: 'employer',
        firstName: 'Test',
        lastName: 'User'
      });
      
      console.log(`✅ Created test user: ${testUser.email}`);
      
      // Now create a TeamAccess record for this user
      const TeamAccess = require('./src/modules/team/teamAccess.model');
      const Business = require('./src/modules/businesses/business.model');
      
      // Find any existing business to grant access to
      const existingBusiness = await Business.findOne({});
      if (existingBusiness) {
        const teamAccess = await TeamAccess.create({
          userEmail: testUser.email,
          employeeId: testUser._id,
          role: 'staff',
          accessLevel: 'view_only',
          status: 'active',
          businessContext: {
            businessId: existingBusiness._id
          },
          permissions: {
            canViewJobs: true,
            canViewBusiness: true
          }
        });
        
        console.log(`✅ Created team access record for business: ${existingBusiness.name}`);
      }
      
      // Now test login with this user
      const authService = require('./src/modules/auth/auth.service');
      
      console.log('\n🧪 Testing login...');
      const loginResult = await authService.login({
        email: testUser.email,
        password: 'password123'
      });
      
      console.log('✅ Login successful!');
      console.log('📊 Login result:');
      console.log('  - User email:', loginResult.user?.email);
      console.log('  - ownedBusinesses count:', loginResult.ownedBusinesses?.length || 0);
      console.log('  - teamBusinesses count:', loginResult.teamBusinesses?.length || 0);
      
      if (loginResult.teamBusinesses && loginResult.teamBusinesses.length > 0) {
        console.log('\n🎉 TeamBusinesses found in login response:');
        loginResult.teamBusinesses.forEach((business, index) => {
          console.log(`  ${index + 1}. ${business.businessName} (${business.source})`);
          console.log(`     - ID: ${business.businessId}`);
          console.log(`     - Role: ${business.role}`);
          if (business.accessLevel) console.log(`     - Access Level: ${business.accessLevel}`);
        });
      } else {
        console.log('⚠️ No teamBusinesses found in login response');
      }
      
    } catch (createError) {
      if (createError.code === 11000) {
        console.log('📝 Test user already exists, trying to login...');
        
        // Find the existing user and try login
        const existingUser = await User.findOne({ email: 'test-team-access@example.com' });
        if (existingUser) {
          console.log(`👤 Found existing test user: ${existingUser.email}`);
          
          // Try to login (might fail if password is different)
          const authService = require('./src/modules/auth/auth.service');
          try {
            const loginResult = await authService.login({
              email: existingUser.email,
              password: 'password123'
            });
            
            console.log('✅ Login successful with existing user!');
            console.log('📊 teamBusinesses count:', loginResult.teamBusinesses?.length || 0);
            
            if (loginResult.teamBusinesses && loginResult.teamBusinesses.length > 0) {
              console.log('\n🎉 TeamBusinesses found:');
              loginResult.teamBusinesses.forEach((business, index) => {
                console.log(`  ${index + 1}. ${business.businessName} (${business.source})`);
              });
            }
          } catch (loginError) {
            console.log('❌ Login failed:', loginError.message);
          }
        }
      } else {
        throw createError;
      }
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testUserPassword();