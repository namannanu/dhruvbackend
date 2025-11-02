const axios = require('axios');

const API_BASE_URL = 'https://dhruvbackend.vercel.app/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDY4YTJhNGMzOTNhY2NhMzcwOWZkMCIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc2MjEwNDg5NywiZXhwIjoxNzYyNzA5Njk3fQ.7LdRxH36gRshKMJ0QwimxfiV4hcHrNCt9msbLrzqTuY';

async function fixExistingJobs() {
  try {
    console.log('🔧 Fixing existing jobs to include business addresses...');
    
    // Get all businesses first to cache their locations
    const businessResponse = await axios.get(`${API_BASE_URL}/businesses`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const businesses = businessResponse.data.data || [];
    const businessLocationMap = {};
    
    businesses.forEach(business => {
      if (business.location) {
        businessLocationMap[business._id] = business.location;
        console.log(`📍 Cached location for business ${business.name}: ${business.location.formattedAddress}`);
      }
    });

    // Get all jobs
    const jobsResponse = await axios.get(`${API_BASE_URL}/jobs`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const jobs = jobsResponse.data.data || [];
    console.log(`📊 Found ${jobs.length} jobs to potentially update`);

    let updatedCount = 0;
    
    for (const job of jobs) {
      // Extract business ID more carefully
      let businessId;
      if (typeof job.business === 'string') {
        businessId = job.business;
      } else if (job.business && job.business._id) {
        // Handle ObjectId type
        businessId = job.business._id.toString();
      } else if (job.businessId) {
        businessId = typeof job.businessId === 'string' ? job.businessId : job.businessId.toString();
      } else {
        console.log(`⚠️  Could not extract business ID for job ${job._id}`);
        continue;
      }
      
      const hasJobLocation = job.location && (job.location.formattedAddress || job.location.line1);
      const businessLocation = businessLocationMap[businessId];
      
      console.log(`\n📋 Job: ${job.title}`);
      console.log(`🆔 Job ID: ${job._id}`);
      console.log(`🏢 Business ID: ${businessId}`);
      console.log(`📍 Has job location: ${hasJobLocation ? 'YES' : 'NO'}`);
      console.log(`🏢 Business has location: ${businessLocation ? 'YES' : 'NO'}`);
      
      // Only update if job has no location but business has location
      if (!hasJobLocation && businessLocation) {
        console.log(`🔧 Updating job ${job._id} with business location...`);
        
        try {
          // Update job with business location
          const updatePayload = {
            location: {
              ...businessLocation,
              setBy: job.createdBy || job.employer,
              setAt: new Date().toISOString(),
              notes: `Copied from business location during migration`
            }
          };
          
          const updateResponse = await axios.patch(`${API_BASE_URL}/jobs/${job._id}`, updatePayload, {
            headers: {
              'Authorization': `Bearer ${AUTH_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (updateResponse.status === 200) {
            console.log(`✅ Successfully updated job ${job._id}`);
            updatedCount++;
          } else {
            console.log(`⚠️  Update response status: ${updateResponse.status}`);
          }
        } catch (updateError) {
          console.error(`❌ Failed to update job ${job._id}:`, updateError.response?.data?.message || updateError.message);
        }
      } else if (hasJobLocation) {
        console.log(`✅ Job already has location, skipping`);
      } else if (!businessLocation) {
        console.log(`⚠️  Business has no location data, skipping`);
      }
    }
    
    console.log(`\n🎉 Migration completed! Updated ${updatedCount} jobs out of ${jobs.length} total jobs.`);
    
  } catch (error) {
    console.error('❌ Error during job migration:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔑 Authentication failed. Please update AUTH_TOKEN with a fresh token from the Flutter app.');
    }
  }
}

fixExistingJobs();