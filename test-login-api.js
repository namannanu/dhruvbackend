const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

async function testLoginAPI() {
  try {
    console.log('🔄 Starting server to test login API...');
    
    // Start the server
    require('./src/app');
    
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test the login endpoint
    const fetch = require('node-fetch');
    
    const loginData = {
      email: 'y@y.com',
      password: 'password123' // This may not be correct, but we'll see what happens
    };

    console.log('🧪 Testing login API...');
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const result = await response.json();
    console.log('📡 API Response Status:', response.status);
    
    if (response.status === 200) {
      console.log('✅ Login successful!');
      console.log('📊 Response data structure:');
      console.log('  - User:', !!result.data?.user);
      console.log('  - ownedBusinesses count:', result.data?.ownedBusinesses?.length || 0);
      console.log('  - teamBusinesses count:', result.data?.teamBusinesses?.length || 0);
      
      if (result.data?.teamBusinesses && result.data.teamBusinesses.length > 0) {
        console.log('\n🎉 TeamBusinesses in API response:');
        result.data.teamBusinesses.forEach((business, index) => {
          console.log(`  ${index + 1}. ${business.businessName}`);
          console.log(`     - ID: ${business.businessId}`);
          console.log(`     - Role: ${business.role}`);
          if (business.accessLevel) console.log(`     - Access Level: ${business.accessLevel}`);
          if (business.source) console.log(`     - Source: ${business.source}`);
        });
      } else {
        console.log('⚠️ No teamBusinesses in API response');
      }
    } else {
      console.log('❌ Login failed:', result.message || result.error);
      console.log('🔍 Full response:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testLoginAPI();