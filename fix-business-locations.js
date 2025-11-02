const axios = require('axios');

const API_BASE_URL = 'https://dhruvbackend.vercel.app/api';

// Sample location data for testing
const sampleLocations = [
  {
    formattedAddress: "123 Main Street, Mumbai, Maharashtra 400001, India",
    line1: "123 Main Street",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
    country: "India",
    latitude: 19.0760,
    longitude: 72.8777,
    allowedRadius: 150,
    isActive: true,
    notes: "Main office location"
  },
  {
    formattedAddress: "456 Business Park, Delhi, Delhi 110001, India",
    line1: "456 Business Park",
    city: "Delhi",
    state: "Delhi",
    postalCode: "110001",
    country: "India",
    latitude: 28.6139,
    longitude: 77.2090,
    allowedRadius: 200,
    isActive: true,
    notes: "Corporate headquarters"
  },
  {
    formattedAddress: "789 Tech Hub, Bangalore, Karnataka 560001, India",
    line1: "789 Tech Hub",
    city: "Bangalore",
    state: "Karnataka",
    postalCode: "560001",
    country: "India",
    latitude: 12.9716,
    longitude: 77.5946,
    allowedRadius: 100,
    isActive: true,
    notes: "Development center"
  }
];

// You'll need to get a valid auth token from the app
// This should be a token for an employer user who owns businesses
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDY4YTJhNGMzOTNhY2NhMzcwOWZkMCIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc2MjEwNDg5NywiZXhwIjoxNzYyNzA5Njk3fQ.7LdRxH36gRshKMJ0QwimxfiV4hcHrNCt9msbLrzqTuY'; // Employer token from Flutter logs

async function fixBusinessLocations() {
  try {
    console.log('🔍 Fetching businesses from Vercel API...');
    
    // First, login to get an auth token (you need valid credentials)
    console.log('⚠️  You need to manually get an auth token from the Flutter app');
    console.log('1. Login to the Flutter app as an employer');
    console.log('2. Check the terminal logs for a token that starts with "eyJ..."');
    console.log('3. Replace AUTH_TOKEN in this script with that token');
    console.log('4. Run this script again');
    
    if (AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
      console.log('❌ Please set a valid AUTH_TOKEN first');
      return;
    }

    // Get businesses list
    const businessesResponse = await axios.get(`${API_BASE_URL}/businesses`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const businesses = businessesResponse.data.data || [];
    console.log(`📊 Found ${businesses.length} businesses`);

    if (businesses.length === 0) {
      console.log('❌ No businesses found or auth token invalid');
      return;
    }

    // Update each business with location data
    for (let i = 0; i < businesses.length; i++) {
      const business = businesses[i];
      const locationData = sampleLocations[i % sampleLocations.length]; // Cycle through sample data
      
      console.log(`\n🏢 Updating business: ${business.name || business.businessName}`);
      console.log(`📍 Business ID: ${business._id}`);
      
      try {
        // Update the business with location data
        const updateResponse = await axios.put(`${API_BASE_URL}/businesses/${business._id}`, {
          location: locationData
        }, {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        if (updateResponse.status === 200) {
          console.log(`✅ Added location: ${locationData.formattedAddress}`);
        } else {
          console.log(`⚠️  Update response: ${updateResponse.status}`);
        }
      } catch (updateError) {
        console.error(`❌ Failed to update business ${business._id}:`, updateError.response?.data || updateError.message);
      }
    }

    console.log('\n🎉 Business location updates completed!');
    
    // Verify the updates
    console.log('\n=== VERIFICATION ===');
    const verificationResponse = await axios.get(`${API_BASE_URL}/businesses`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const updatedBusinesses = verificationResponse.data.data || [];
    updatedBusinesses.forEach(business => {
      const address = business.location?.formattedAddress || 'NO ADDRESS';
      console.log(`${business.name || business.businessName}: ${address}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔑 Authentication failed. To get a valid token:');
      console.log('1. Run the Flutter app: flutter run --debug');
      console.log('2. Login as an employer user');
      console.log('3. Look for lines like: "🔑 Token stored and cached: eyJ..."');
      console.log('4. Copy the token and update AUTH_TOKEN in this script');
    }
  }
}

fixBusinessLocations();
