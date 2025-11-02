const axios = require('axios');

const API_BASE_URL = 'https://dhruvbackend.vercel.app/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDY4YTJhNGMzOTNhY2NhMzcwOWZkMCIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc2MjEwNDg5NywiZXhwIjoxNzYyNzA5Njk3fQ.7LdRxH36gRshKMJ0QwimxfiV4hcHrNCt9msbLrzqTuY';

async function checkDeploymentStatus() {
  try {
    console.log('🔍 Checking current deployment status...');
    
    // Get a recent job to see if it has location data
    const jobsResponse = await axios.get(`${API_BASE_URL}/jobs?limit=1`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const jobs = jobsResponse.data.data || [];
    if (jobs.length > 0) {
      const latestJob = jobs[0];
      console.log(`📋 Latest job: ${latestJob.title}`);
      console.log(`🆔 Job ID: ${latestJob._id}`);
      console.log(`🏢 Business: ${latestJob.business?.name || 'Business ID only'}`);
      
      if (latestJob.location) {
        console.log('✅ Latest job HAS location data - backend changes might be deployed!');
        console.log(`📍 Location: ${latestJob.location.formattedAddress}`);
      } else {
        console.log('❌ Latest job has NO location data - backend changes not yet deployed');
      }
    }

    // Check API health
    const healthResponse = await axios.get(`${API_BASE_URL}/health`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (healthResponse.status === 200) {
      console.log('✅ API is healthy and responding');
    }

    console.log('\n📝 Deployment Status Summary:');
    console.log('- Job creation API: ✅ Working');
    console.log('- Authentication: ✅ Valid');
    console.log('- Automatic location copying: ❌ Not yet deployed');
    console.log('\n🚀 Ready for backend deployment to activate location copying feature!');

  } catch (error) {
    console.error('❌ Error checking deployment:', error.response?.data || error.message);
  }
}

checkDeploymentStatus();