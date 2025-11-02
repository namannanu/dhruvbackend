const mongoose = require('mongoose');
const axios = require('axios');

// Test data simulating what Flutter sends
const testJobData = {
  title: 'Security Guard - Custom Location Test',
  description: 'Test job to verify employer-provided address works',
  businessId: '6705e6cfb92b65ec59e1fa4f', // Use existing business ID
  category: 'Security',
  hourlyRate: 250,
  start: new Date(),
  end: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours later
  // This is how Flutter sends location data with custom address
  location: {
    formattedAddress: 'Custom Event Venue, Main Street', // Employer's custom address
    name: 'apna ghar',
    address: '1 a23 Mahaveer Nagar III Circle',
    city: 'Kota',
    state: 'Rajasthan',
    postalCode: '324005',
    country: 'India'
  },
  urgency: 'medium',
  verificationRequired: false,
  hasOvertime: false
};

async function testCustomAddressJob() {
  try {
    console.log('🧪 Testing job creation with employer-provided custom address');
    console.log('📍 Employer Custom Address:', testJobData.location.formattedAddress);
    console.log('🏢 Business Address Components:', {
      address: testJobData.location.address,
      city: testJobData.location.city,
      state: testJobData.location.state,
      postalCode: testJobData.location.postalCode,
      country: testJobData.location.country
    });

    // Expected result format:
    // "Custom Event Venue, Main Street, 1 a23 Mahaveer Nagar III Circle, Kota, Rajasthan, 324005, India"
    console.log('\n✅ Expected Address Format:');
    console.log('Custom Event Venue, Main Street, 1 a23 Mahaveer Nagar III Circle, Kota, Rajasthan, 324005, India');

    console.log('\n📤 Job Data to Send:');
    console.log(JSON.stringify(testJobData, null, 2));

    // In a real scenario, you would make an API call here
    // const response = await axios.post('http://localhost:3000/api/jobs', testJobData, {
    //   headers: { 'Authorization': 'Bearer your_token_here' }
    // });
    
    console.log('\n🎯 This test shows the data structure that Flutter will send to the backend.');
    console.log('📋 The backend should now extract formattedAddress from the location object');
    console.log('🔧 And combine it with other address components for the full format.');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testCustomAddressJob();