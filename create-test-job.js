const axios = require('axios');

const API_BASE_URL = 'https://dhruvbackend.vercel.app/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDY4YTJhNGMzOTNhY2NhMzcwOWZkMCIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc2MjEwNDg5NywiZXhwIjoxNzYyNzA5Njk3fQ.7LdRxH36gRshKMJ0QwimxfiV4hcHrNCt9msbLrzqTuY';

async function createTestJob() {
  try {
    console.log('🚀 Creating new test job...');
    
    // First, let's get the business to use
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

    console.log(`🏢 Using business: ${businessWithLocation.name}`);
    console.log(`📍 Business location: ${businessWithLocation.location.formattedAddress}`);

    // Create a new job
    const newJobData = {
      title: 'Test Job - Auto Location',
      description: 'This is a test job to verify automatic business location copying',
      business: businessWithLocation._id,
      requirements: ['Test requirement 1', 'Test requirement 2'],
      hourlyRate: 18,
      salary: {
        min: 15,
        max: 20,
        currency: 'USD',
        period: 'hour'
      },
      jobType: 'part-time',
      schedule: {
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      },
      tags: ['test', 'location-test']
    };

    console.log('\n📝 Creating job with data:');
    console.log(JSON.stringify(newJobData, null, 2));

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
      console.log(`🏢 Business: ${createdJob.business?.name || createdJob.business}`);
      
      // Check if location was automatically added
      if (createdJob.location) {
        console.log('\n🎉 SUCCESS! Job automatically includes location:');
        console.log(`📍 Address: ${createdJob.location.formattedAddress}`);
        console.log(`🌍 Coordinates: ${createdJob.location.latitude}, ${createdJob.location.longitude}`);
        if (createdJob.location.allowedRadius) {
          console.log(`📏 Allowed Radius: ${createdJob.location.allowedRadius}m`);
        }
      } else {
        console.log('\n❌ FAILED! Job does not include location data');
        console.log('This suggests the backend changes need to be deployed to Vercel');
      }

      // Let's also fetch the job details to double-check
      console.log('\n🔍 Fetching job details to verify...');
      const fetchResponse = await axios.get(`${API_BASE_URL}/jobs/${createdJob._id}`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const fetchedJob = fetchResponse.data.data;
      console.log('\n📊 Fetched job details:');
      console.log(`📋 Title: ${fetchedJob.title}`);
      console.log(`🏢 Business: ${fetchedJob.business?.name || 'Business ID only'}`);
      
      if (fetchedJob.location) {
        console.log(`📍 Location: ${fetchedJob.location.formattedAddress}`);
        console.log('✅ Location data confirmed in database!');
      } else {
        console.log('❌ No location data found in database');
      }

    } else {
      console.log(`⚠️  Unexpected response status: ${createResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Error creating job:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔑 Authentication failed. Please update AUTH_TOKEN with a fresh token from the Flutter app.');
    } else if (error.response?.data) {
      console.log('\n📝 Detailed error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

createTestJob();