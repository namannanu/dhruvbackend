const axios = require('axios');

const API_BASE_URL = 'https://dhruvbackend.vercel.app/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDY4YTJhNGMzOTNhY2NhMzcwOWZkMCIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc2MjEwNDg5NywiZXhwIjoxNzYyNzA5Njk3fQ.7LdRxH36gRshKMJ0QwimxfiV4hcHrNCt9msbLrzqTuY';

async function inspectJobDetails() {
  try {
    console.log('🔍 Getting detailed job information...');
    
    // Get a specific job
    const jobResponse = await axios.get(`${API_BASE_URL}/jobs/69079d269115b39b1b1c59ad`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const job = jobResponse.data.data;
    
    console.log('\n📊 Full Job Object:');
    console.log(JSON.stringify(job, null, 2));
    
    console.log('\n🔍 Business Object Analysis:');
    if (job.business) {
      console.log('Business fields:', Object.keys(job.business));
      console.log('Business object:', JSON.stringify(job.business, null, 2));
    } else {
      console.log('Business: NULL or missing');
    }

  } catch (error) {
    console.error('❌ Error inspecting job:', error.response?.data || error.message);
  }
}

inspectJobDetails();