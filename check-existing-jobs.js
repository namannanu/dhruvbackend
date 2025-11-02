const axios = require('axios');

const API_BASE_URL = 'https://dhruvbackend.vercel.app/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDY4YTJhNGMzOTNhY2NhMzcwOWZkMCIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc2MjEwNDg5NywiZXhwIjoxNzYyNzA5Njk3fQ.7LdRxH36gRshKMJ0QwimxfiV4hcHrNCt9msbLrzqTuY';

async function checkExistingJobs() {
  try {
    console.log('🔍 Checking existing jobs to see their structure...');
    
    const jobsResponse = await axios.get(`${API_BASE_URL}/jobs?limit=3`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const jobs = jobsResponse.data.data || [];
    
    console.log(`📊 Found ${jobs.length} jobs:`);
    
    jobs.forEach((job, index) => {
      console.log(`\n📋 Job ${index + 1}: ${job.title}`);
      console.log(`🆔 ID: ${job._id}`);
      console.log(`📍 location: ${job.location ? 'EXISTS' : 'NULL'}`);
      console.log(`🏢 businessAddress: ${job.businessAddress || 'EMPTY'}`);
      console.log(`🏢 business type: ${typeof job.business}`);
      
      if (typeof job.business === 'object' && job.business.location) {
        console.log(`   business.location.formattedAddress: ${job.business.location.formattedAddress || 'EMPTY'}`);
      }
      
      // Check all possible address fields
      console.log(`🔍 All address-related fields:`);
      console.log(`   businessName: ${job.businessName || 'EMPTY'}`);
      console.log(`   businessAddress: ${job.businessAddress || 'EMPTY'}`);
      console.log(`   location: ${job.location ? JSON.stringify(job.location) : 'NULL'}`);
    });

    console.log('\n💡 Pattern Analysis:');
    const hasBusinessAddress = jobs.some(job => job.businessAddress);
    const hasLocation = jobs.some(job => job.location);
    const hasBusinessLocationInObject = jobs.some(job => 
      typeof job.business === 'object' && job.business.location
    );
    
    console.log(`✅ Jobs with businessAddress: ${hasBusinessAddress ? 'YES' : 'NO'}`);
    console.log(`✅ Jobs with location: ${hasLocation ? 'YES' : 'NO'}`);
    console.log(`✅ Jobs with business.location: ${hasBusinessLocationInObject ? 'YES' : 'NO'}`);
    
    if (hasBusinessLocationInObject && !hasBusinessAddress) {
      console.log('\n🔧 SOLUTION: Business location exists but businessAddress not set');
      console.log('   This confirms backend changes need deployment to fix the mapping');
    }

  } catch (error) {
    console.error('❌ Error checking jobs:', error.response?.data || error.message);
  }
}

checkExistingJobs();