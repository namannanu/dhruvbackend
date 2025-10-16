const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

async function testLoginTeamAccess() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected successfully');

    // Import required models
    const User = require('./src/modules/users/user.model');
    const TeamAccess = require('./src/modules/team/teamAccess.model');
    const authService = require('./src/modules/auth/auth.service');

    // Find a user with team access
    const userWithTeamAccess = await User.findOne({ email: 'y@y.com' });
    if (!userWithTeamAccess) {
      console.log('❌ User y@y.com not found');
      return;
    }

    console.log(`👤 Testing with user: ${userWithTeamAccess.email} (ID: ${userWithTeamAccess._id})`);

    // Check existing TeamAccess records for this user
    const teamAccessRecords = await TeamAccess.find({ 
      userEmail: userWithTeamAccess.email,
      status: 'active'
    }).populate('businessContext.businessId', 'name industry');

    console.log(`🔍 Found ${teamAccessRecords.length} active TeamAccess records:`);
    teamAccessRecords.forEach((record, index) => {
      console.log(`  Record ${index + 1}:`, {
        businessId: record.businessContext?.businessId?._id,
        businessName: record.businessContext?.businessId?.name,
        role: record.role,
        accessLevel: record.accessLevel,
        status: record.status
      });
    });

    // Test the login flow
    console.log('\n🧪 Testing login response...');
    try {
      const loginResponse = await authService.login({
        email: userWithTeamAccess.email,
        password: 'password123' // You may need to adjust this
      });

      console.log('✅ Login successful!');
      console.log('📊 Login response structure:');
      console.log('  - User:', !!loginResponse.user);
      console.log('  - ownedBusinesses count:', loginResponse.ownedBusinesses?.length || 0);
      console.log('  - teamBusinesses count:', loginResponse.teamBusinesses?.length || 0);
      
      if (loginResponse.teamBusinesses && loginResponse.teamBusinesses.length > 0) {
        console.log('\n🎉 TeamBusinesses found:');
        loginResponse.teamBusinesses.forEach((business, index) => {
          console.log(`  Business ${index + 1}:`, {
            businessId: business.businessId,
            businessName: business.businessName,
            role: business.role,
            accessLevel: business.accessLevel,
            source: business.source
          });
        });
      } else {
        console.log('⚠️ No teamBusinesses found in login response');
      }

    } catch (loginError) {
      console.log('❌ Login failed:', loginError.message);
      console.log('💡 This might be due to password mismatch - the test just checks if the function works');
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testLoginTeamAccess();