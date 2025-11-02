const axios = require('axios');

const API_BASE_URL = 'https://dhruvbackend.vercel.app/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDY4YTJhNGMzOTNhY2NhMzcwOWZkMCIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc2MjEwNDg5NywiZXhwIjoxNzYyNzA5Njk3fQ.7LdRxH36gRshKMJ0QwimxfiV4hcHrNCt9msbLrzqTuY';

async function testJobData() {
  try {
    console.log('🔍 Testing job data from Vercel API...');
    
    // Test jobs endpoint
    const jobsResponse = await axios.get(`${API_BASE_URL}/jobs`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const jobs = jobsResponse.data.data || [];
    console.log(`📊 Found ${jobs.length} jobs`);

    if (jobs.length > 0) {
      console.log('\n=== JOB DATA ANALYSIS ===');
      jobs.forEach((job, index) => {
        console.log(`\n📋 Job ${index + 1}: ${job.title}`);
        console.log(`🆔 Job ID: ${job._id}`);
        console.log(`🏢 Business ID: ${job.business}`);
        console.log(`📍 Job Location:`, job.location ? 'HAS LOCATION' : 'NO LOCATION');
        if (job.location) {
          console.log(`   - formattedAddress: ${job.location.formattedAddress || 'EMPTY'}`);
        }
        console.log(`🏢 Business Address: ${job.businessAddress || 'EMPTY'}`);
        console.log(`🏢 Business Name: ${job.businessName || 'EMPTY'}`);
        console.log(`🏢 Business Details:`, job.businessDetails ? 'YES' : 'NO');
        if (job.businessDetails) {
          console.log(`   - businessDetails.name: ${job.businessDetails.name || 'EMPTY'}`);
          console.log(`   - businessDetails.location: ${job.businessDetails.location ? 'EXISTS' : 'NULL'}`);
          if (job.businessDetails.location) {
            console.log(`     * formattedAddress: ${job.businessDetails.location.formattedAddress || 'EMPTY'}`);
            console.log(`     * line1: ${job.businessDetails.location.line1 || 'EMPTY'}`);
            console.log(`     * city: ${job.businessDetails.location.city || 'EMPTY'}`);
          }
        }
      });
    }

    // Test a specific business to compare
    console.log('\n=== BUSINESS DATA COMPARISON ===');
    const businessResponse = await axios.get(`${API_BASE_URL}/businesses`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const businesses = businessResponse.data.data || [];
    businesses.forEach(business => {
      console.log(`\n🏢 Business: ${business.name || business.businessName}`);
      console.log(`🆔 Business ID: ${business._id}`);
      console.log(`📍 Location:`, business.location ? 'HAS LOCATION' : 'NO LOCATION');
      if (business.location) {
        console.log(`   - formattedAddress: ${business.location.formattedAddress || 'EMPTY'}`);
        console.log(`   - line1: ${business.location.line1 || 'EMPTY'}`);
        console.log(`   - city: ${business.location.city || 'EMPTY'}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testJobData();