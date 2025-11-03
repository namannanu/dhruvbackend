const axios = require('axios');

// Test script to verify custom address posting works correctly
async function testAddressPosting() {
  console.log('🧪 CUSTOM ADDRESS POSTING TEST');
  console.log('==============================\n');

  const API_BASE = 'http://localhost:3000/api';
  
  // Test data mimicking what Flutter sends
  const jobData = {
    title: 'Security Guard - Address Test',
    description: 'Testing custom address functionality',
    hourlyRate: 250,
    urgency: 'medium',
    tags: ['security'],
    verificationRequired: false,
    business: '672c2742dc0b3e7a91ac4e92', // Replace with actual business ID
    schedule: {
      startDate: '2025-11-04T18:00:00.000Z',
      endDate: '2025-11-05T02:00:00.000Z',
      startTime: '18:00',
      endTime: '02:00',
      recurrence: 'one-time',
      workDays: []
    },
    hasOvertime: false,
    // Location object with business data + custom address
    location: {
      formattedAddress: '1 a23 Mahaveer Nagar III Circle, Kota (Event Hall, 2nd Floor)', // CUSTOM ADDRESS
      name: 'apna ghar',
      address: '1 a23 Mahaveer Nagar III Circle, Kota, Rajasthan, 324005', // Original business address
      city: 'Kota',
      state: 'Rajasthan',
      postalCode: '324005',
      country: 'India',
      latitude: 25.2138156,
      longitude: 75.8647527,
      allowedRadius: 150
    },
    // Also sending as top-level field (dual-path approach)
    formattedAddress: '1 a23 Mahaveer Nagar III Circle, Kota (Event Hall, 2nd Floor)'
  };

  console.log('📤 SENDING TO BACKEND:');
  console.log('----------------------');
  console.log('🏠 location.formattedAddress:', jobData.location.formattedAddress);
  console.log('🏠 location.address (original):', jobData.location.address);
  console.log('🏠 formattedAddress (top-level):', jobData.formattedAddress);
  console.log('🏢 business ID:', jobData.business);

  try {
    console.log('\n🚀 Making API call...');
    
    // Mock the API call (you'd need actual auth token)
    console.log('📡 POST /api/jobs');
    console.log('📋 Payload:', JSON.stringify(jobData, null, 2));
    
    console.log('\n✅ EXPECTED BACKEND BEHAVIOR:');
    console.log('------------------------------');
    console.log('1️⃣ Extract employerProvidedAddress from:');
    console.log('   - jobData.formattedAddress OR');
    console.log('   - jobData.location.formattedAddress');
    console.log('2️⃣ Call deriveBusinessAddress() with:');
    console.log('   - providedAddress: "1 a23 Mahaveer Nagar III Circle, Kota (Event Hall, 2nd Floor)"');
    console.log('   - location: business coordinates');
    console.log('   - business: business object');
    console.log('3️⃣ deriveBusinessAddress() should return the exact custom address');
    console.log('4️⃣ Store as job.businessAddress for display to workers');
    
    console.log('\n🎯 VERIFICATION POINTS:');
    console.log('-----------------------');
    console.log('✅ Backend logs should show employer-provided address');
    console.log('✅ Job should be created with businessAddress = custom text');
    console.log('✅ Workers should see "Event Hall, 2nd Floor" in job listing');
    console.log('✅ Original business address should remain unchanged');

    // For actual testing, you would uncomment this:
    /*
    const response = await axios.post(`${API_BASE}/jobs`, jobData, {
      headers: {
        'Authorization': 'Bearer YOUR_AUTH_TOKEN_HERE',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n📥 BACKEND RESPONSE:');
    console.log('--------------------');
    console.log('Status:', response.status);
    console.log('businessAddress:', response.data.job.businessAddress);
    */
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAddressPosting();