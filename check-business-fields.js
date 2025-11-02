const axios = require('axios');

const API_BASE_URL = 'https://dhruvbackend.vercel.app/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDY4YTJhNGMzOTNhY2NhMzcwOWZkMCIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc2MjEwNDg5NywiZXhwIjoxNzYyNzA5Njk3fQ.7LdRxH36gRshKMJ0QwimxfiV4hcHrNCt9msbLrzqTuY';

async function checkBusinessDetails() {
  try {
    const response = await axios.get(`${API_BASE_URL}/jobs/69079d269115b39b1b1c59ad`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const job = response.data.data;
    
    console.log('=== BUSINESS OBJECT DETAILS ===');
    console.log('Business fields:', Object.keys(job.business));
    console.log('Business data:');
    for (const [key, value] of Object.entries(job.business)) {
      console.log(`  ${key}: ${typeof value} - ${value}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkBusinessDetails();