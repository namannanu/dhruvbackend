const axios = require('axios');

const API_BASE_URL = 'https://dhruvbackend.vercel.app/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDY4YTJhNGMzOTNhY2NhMzcwOWZkMCIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc2MjEwNDg5NywiZXhwIjoxNzYyNzA5Njk3fQ.7LdRxH36gRshKMJ0QwimxfiV4hcHrNCt9msbLrzqTuY';

async function debugJobCreation() {
  try {
    console.log('🔍 Debug: Checking business data and job creation...');
    
    // First, get business details to see exact location structure
    const businessResponse = await axios.get(`${API_BASE_URL}/businesses`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const businesses = businessResponse.data.data || [];
    const businessWithLocation = businesses.find(b => b.location && b.location.formattedAddress);
    
    if (!businessWithLocation) {
      console.log('❌ No business with location found');
      return;
    }

    console.log('\n📊 Business Details:');
    console.log(`🏢 Name: ${businessWithLocation.name}`);
    console.log(`🆔 ID: ${businessWithLocation._id}`);
    console.log(`📍 Location object:`, JSON.stringify(businessWithLocation.location, null, 2));

    // Create job with minimal data to test location copying
    const newJobData = {
      title: 'Debug Location Test Job',
      description: 'Testing automatic location copying with detailed logging',
      business: businessWithLocation._id,
      hourlyRate: 20,
      requirements: ['Debug test'],
      jobType: 'part-time'
    };

    console.log('\n📝 Creating job to test location copying...');

    const createResponse = await axios.post(`${API_BASE_URL}/jobs`, newJobData, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (createResponse.status === 201) {
      const createdJob = createResponse.data.data;
      console.log('\n✅ Job created successfully!');
      console.log(`🆔 Job ID: ${createdJob._id}`);
      console.log(`📋 Job Title: ${createdJob.title}`);
      
      // Check location in response
      console.log('\n🔍 Location Analysis:');
      console.log(`📍 job.location:`, createdJob.location ? 'EXISTS' : 'NULL');
      if (createdJob.location) {
        console.log(`   formattedAddress: ${createdJob.location.formattedAddress || 'EMPTY'}`);
        console.log(`   latitude: ${createdJob.location.latitude || 'EMPTY'}`);
        console.log(`   longitude: ${createdJob.location.longitude || 'EMPTY'}`);
      }
      
      console.log(`🏢 job.businessAddress: ${createdJob.businessAddress || 'EMPTY'}`);
      console.log(`🏢 job.business:`, typeof createdJob.business === 'object' ? 'OBJECT' : 'STRING');
      
      if (typeof createdJob.business === 'object') {
        console.log(`   business.location:`, createdJob.business.location ? 'EXISTS' : 'NULL');
        if (createdJob.business.location) {
          console.log(`   business.location.formattedAddress: ${createdJob.business.location.formattedAddress || 'EMPTY'}`);
        }
      }

      // Fetch job again to double-check
      console.log('\n🔄 Re-fetching job to verify database state...');
      const fetchResponse = await axios.get(`${API_BASE_URL}/jobs/${createdJob._id}`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const fetchedJob = fetchResponse.data.data;
      console.log('\n📊 Fetched Job Analysis:');
      console.log(`📍 fetched.location:`, fetchedJob.location ? 'EXISTS' : 'NULL');
      if (fetchedJob.location) {
        console.log(`   formattedAddress: ${fetchedJob.location.formattedAddress || 'EMPTY'}`);
      }
      console.log(`🏢 fetched.businessAddress: ${fetchedJob.businessAddress || 'EMPTY'}`);

      // Check if backend logs show location copying
      console.log('\n💡 Analysis Summary:');
      if (fetchedJob.location && fetchedJob.location.formattedAddress) {
        console.log('✅ SUCCESS: Job has location data from business!');
        console.log(`📍 Address: ${fetchedJob.location.formattedAddress}`);
      } else if (fetchedJob.businessAddress) {
        console.log('✅ PARTIAL: Job has businessAddress field!');
        console.log(`🏢 Address: ${fetchedJob.businessAddress}`);
      } else {
        console.log('❌ ISSUE: Job has no location or businessAddress');
        console.log('🔧 This indicates backend changes may not be fully deployed');
      }

    } else {
      console.log(`⚠️  Unexpected response status: ${createResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Error in debug:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.log('\n📝 Detailed error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugJobCreation();