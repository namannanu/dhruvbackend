const axios = require('axios');

const API_BASE_URL = 'https://dhruvbackend.vercel.app/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDY4YTJhNGMzOTNhY2NhMzcwOWZkMCIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc2MjEwNDg5NywiZXhwIjoxNzYyNzA5Njk3fQ.7LdRxH36gRshKMJ0QwimxfiV4hcHrNCt9msbLrzqTuY';

async function checkBusinessField() {
  try {
    const response = await axios.get(`${API_BASE_URL}/jobs/69079d269115b39b1b1c59ad`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const job = response.data.data;
    
    console.log('Job title:', job.title);
    console.log('Business address field:', job.businessAddress);
    console.log('Business object exists:', !!job.business);
    
    if (job.business) {
      console.log('Business name:', job.business.name);
      console.log('Business location exists:', !!job.business.location);
      
      if (job.business.location) {
        console.log('Business location fields:', Object.keys(job.business.location));
        console.log('Business formatted address:', job.business.location.formattedAddress);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkBusinessField();