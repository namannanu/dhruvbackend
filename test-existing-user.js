const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

async function testExistingUserLogin() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected successfully');

    const User = require('./src/modules/users/user.model');
    const TeamAccess = require('./src/modules/team/teamAccess.model');
    const Business = require('./src/modules/businesses/business.model');
    
    // Check the user that the Flutter app might be using
    // From the conversation, it seems like 'pp@gmail.com' has active team access
    const testEmail = 'pp@gmail.com';
    
    console.log(`👤 Testing with user: ${testEmail}`);
    
    // Check if user exists
    const user = await User.findOne({ email: testEmail });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ User found: ${user.email} (ID: ${user._id})`);
    
    // Check their team access
    const teamAccess = await TeamAccess.find({ 
      userEmail: testEmail, 
      status: 'active' 
    }).populate('businessContext.businessId', 'name industry');
    
    console.log(`🔍 Found ${teamAccess.length} active team access records:`);
    teamAccess.forEach((access, index) => {
      console.log(`  ${index + 1}. Business: ${access.businessContext?.businessId?.name || 'Unknown'}`);
      console.log(`     - Role: ${access.role}`);
      console.log(`     - Access Level: ${access.accessLevel}`);
      console.log(`     - Status: ${access.status}`);
    });
    
    // Test the buildBusinessCollections function
    const authService = require('./src/modules/auth/auth.service');
    
    // We need to test getSession which calls buildUserResponse
    console.log('\n🧪 Testing getSession (which uses buildBusinessCollections)...');
    try {
      const sessionResult = await authService.getSession(user._id);
      
      console.log('✅ getSession successful!');
      console.log('📊 Session result:');
      console.log('  - User email:', sessionResult.user?.email);
      console.log('  - ownedBusinesses count:', sessionResult.ownedBusinesses?.length || 0);
      console.log('  - teamBusinesses count:', sessionResult.teamBusinesses?.length || 0);
      
      if (sessionResult.teamBusinesses && sessionResult.teamBusinesses.length > 0) {
        console.log('\n🎉 TeamBusinesses found in session:');
        sessionResult.teamBusinesses.forEach((business, index) => {
          console.log(`  ${index + 1}. ${business.businessName} (${business.source || 'unknown source'})`);
          console.log(`     - ID: ${business.businessId}`);
          console.log(`     - Role: ${business.role}`);
          if (business.accessLevel) console.log(`     - Access Level: ${business.accessLevel}`);
        });
        
        console.log('\n📱 This means the Flutter app should now see these businesses in the dropdown!');
      } else {
        console.log('⚠️ No teamBusinesses found in session');
      }
      
      // Also show the business context if any
      if (sessionResult.businessContext) {
        console.log('\n🏢 Default business context:');
        console.log(`  - Business: ${sessionResult.businessContext.businessName}`);
        console.log(`  - Role: ${sessionResult.businessContext.role}`);
      }
      
    } catch (sessionError) {
      console.log('❌ getSession failed:', sessionError.message);
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testExistingUserLogin();