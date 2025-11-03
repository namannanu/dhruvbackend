const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test tokens (replace with actual tokens from your auth system)
const TOKENS = {
  // Employee token with create_jobs permission
  employee: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDM2YTBkYjFhN2NmYWIzYzRjY2JiZCIsInJvbGUiOiJ3b3JrZXIiLCJpYXQiOjE3NjIxNzQ1OTEsImV4cCI6MTc2Mjc3OTM5MX0.unofecb4qZ-qe4SzskAoWOrfeTNZ8y4O1QraUJcICE0",
  // Worker token
  worker: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDM2YTBkYjFhN2NmYWIzYzRjY2JiZCIsInJvbGUiOiJ3b3JrZXIiLCJpYXQiOjE3NjIxNzQ1OTEsImV4cCI6MTc2Mjc3OTM5MX0.unofecb4qZ-qe4SzskAoWOrfeTNZ8y4O1QraUJcICE0"
};

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, token = null) {
  const config = {
    method,
    url: `${API_BASE}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...(data && { data })
  };

  try {
    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      data: error.response?.data || { message: error.message }
    };
  }
}

// Test functions
async function testBusinessAddressIntegration() {
  console.log('\n🏢 Testing Business Address Integration in Job Creation\n');
  
  // Step 1: Get business information first
  console.log('1. Fetching business information...');
  const businessResponse = await apiCall('GET', '/businesses', null, TOKENS.employee);
  
  if (!businessResponse.success || !businessResponse.data.data || businessResponse.data.data.length === 0) {
    console.error('❌ No businesses found or error fetching businesses');
    console.log('Response:', JSON.stringify(businessResponse, null, 2));
    return;
  }
  
  const business = businessResponse.data.data[0];
  console.log(`✅ Found business: ${business.name}`);
  console.log(`📍 Business location:`, JSON.stringify(business.location, null, 2));
  
  // Step 2: Create job WITHOUT specifying location (should use business address)
  console.log('\n2. Creating job without location (should auto-use business address)...');
  const jobData = {
    title: "Test Job with Auto Business Address",
    description: "This job should automatically inherit the business address",
    hourlyRate: 25,
    business: business._id,
    schedule: {
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      startTime: "09:00",
      endTime: "17:00",
      workDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    },
    tags: ["test", "auto-address"],
    urgency: "medium"
  };
  
  const createJobResponse = await apiCall('POST', '/jobs', jobData, TOKENS.employee);
  
  if (!createJobResponse.success) {
    console.error('❌ Failed to create job');
    console.log('Response:', JSON.stringify(createJobResponse, null, 2));
    return;
  }
  
  const createdJob = createJobResponse.data.data;
  console.log(`✅ Job created successfully: ${createdJob.title}`);
  console.log(`📍 Job location:`, JSON.stringify(createdJob.location, null, 2));
  
  // Verify that job location matches business location
  if (createdJob.location && business.location) {
    const addressMatch = createdJob.location.city === business.location.city &&
                        createdJob.location.state === business.location.state &&
                        createdJob.location.latitude === business.location.latitude &&
                        createdJob.location.longitude === business.location.longitude;
    
    if (addressMatch) {
      console.log('✅ Job successfully inherited business address!');
    } else {
      console.log('⚠️  Job location does not match business location');
    }
  }
  
  // Step 3: Create job WITH custom location (should use provided location)
  console.log('\n3. Creating job with custom location (should override business address)...');
  const customJobData = {
    ...jobData,
    title: "Test Job with Custom Address",
    description: "This job should use the provided custom address",
    location: {
      address: "123 Custom Street, Custom City",
      city: "Custom City",
      state: "Custom State",
      postalCode: "12345",
      latitude: 40.7128,
      longitude: -74.0060
    }
  };
  
  const customJobResponse = await apiCall('POST', '/jobs', customJobData, TOKENS.employee);
  
  if (!customJobResponse.success) {
    console.error('❌ Failed to create job with custom location');
    console.log('Response:', JSON.stringify(customJobResponse, null, 2));
    return;
  }
  
  const customJob = customJobResponse.data.data;
  console.log(`✅ Job with custom location created: ${customJob.title}`);
  console.log(`📍 Custom job location:`, JSON.stringify(customJob.location, null, 2));
  
  return {
    businessAddressJob: createdJob,
    customAddressJob: customJob,
    business: business
  };
}

async function testJobFetchingForEmployeeAndWorker(jobs) {
  console.log('\n👥 Testing Job Fetching for Employee and Worker\n');
  
  if (!jobs || !jobs.businessAddressJob) {
    console.log('⚠️  No jobs to test with');
    return;
  }
  
  const jobId = jobs.businessAddressJob._id;
  
  // Step 1: Fetch job as Employee
  console.log('1. Fetching job as Employee...');
  const employeeJobResponse = await apiCall('GET', `/jobs/${jobId}`, null, TOKENS.employee);
  
  if (employeeJobResponse.success) {
    console.log('✅ Employee can fetch job successfully');
    console.log(`📍 Location visible to employee:`, JSON.stringify(employeeJobResponse.data.data.location, null, 2));
  } else {
    console.error('❌ Employee failed to fetch job');
    console.log('Response:', JSON.stringify(employeeJobResponse, null, 2));
  }
  
  // Step 2: Fetch job as Worker
  console.log('\n2. Fetching job as Worker...');
  const workerJobResponse = await apiCall('GET', `/jobs/${jobId}`, null, TOKENS.worker);
  
  if (workerJobResponse.success) {
    console.log('✅ Worker can fetch job successfully');
    console.log(`📍 Location visible to worker:`, JSON.stringify(workerJobResponse.data.data.location, null, 2));
  } else {
    console.error('❌ Worker failed to fetch job');
    console.log('Response:', JSON.stringify(workerJobResponse, null, 2));
  }
  
  // Step 3: Fetch job without token (public access test)
  console.log('\n3. Fetching job without token (public access)...');
  const publicJobResponse = await apiCall('GET', `/jobs/${jobId}`);
  
  if (publicJobResponse.success) {
    console.log('✅ Job accessible without token');
    console.log(`📍 Location visible publicly:`, JSON.stringify(publicJobResponse.data.data.location, null, 2));
  } else {
    console.log('ℹ️  Job requires authentication (expected behavior)');
    console.log(`Status: ${publicJobResponse.status}`);
  }
}

async function testJobListingWithLocation() {
  console.log('\n📋 Testing Job Listing with Location Data\n');
  
  // Step 1: List all jobs as Employee
  console.log('1. Listing jobs as Employee...');
  const employeeListResponse = await apiCall('GET', '/jobs', null, TOKENS.employee);
  
  if (employeeListResponse.success) {
    const jobs = employeeListResponse.data.data;
    console.log(`✅ Found ${jobs.length} jobs as Employee`);
    
    jobs.forEach((job, index) => {
      console.log(`\nJob ${index + 1}: ${job.title}`);
      console.log(`📍 Location:`, job.location ? JSON.stringify(job.location, null, 2) : 'No location');
      console.log(`🏢 Business:`, job.business?.name || 'No business info');
    });
  } else {
    console.error('❌ Failed to list jobs as Employee');
  }
  
  // Step 2: List jobs as Worker
  console.log('\n2. Listing jobs as Worker...');
  const workerListResponse = await apiCall('GET', '/jobs', null, TOKENS.worker);
  
  if (workerListResponse.success) {
    const jobs = workerListResponse.data.data;
    console.log(`✅ Found ${jobs.length} jobs as Worker`);
    
    jobs.slice(0, 3).forEach((job, index) => {
      console.log(`\nJob ${index + 1}: ${job.title}`);
      console.log(`📍 Location:`, job.location ? JSON.stringify(job.location, null, 2) : 'No location');
      console.log(`💰 Hourly Rate: $${job.hourlyRate}`);
    });
  } else {
    console.error('❌ Failed to list jobs as Worker');
  }
}

async function testLocationBasedJobSearch() {
  console.log('\n🗺️  Testing Location-Based Job Search\n');
  
  // Test with sample coordinates (New York City area)
  const searchParams = {
    lat: 40.7128,
    lng: -74.0060,
    radius: 50 // 50km radius
  };
  
  console.log(`Searching for jobs near coordinates: ${searchParams.lat}, ${searchParams.lng} within ${searchParams.radius}km radius`);
  
  const searchResponse = await apiCall('GET', `/jobs?lat=${searchParams.lat}&lng=${searchParams.lng}&radius=${searchParams.radius}`, null, TOKENS.worker);
  
  if (searchResponse.success) {
    const jobs = searchResponse.data.data;
    console.log(`✅ Found ${jobs.length} jobs within radius`);
    
    jobs.slice(0, 3).forEach((job, index) => {
      console.log(`\nJob ${index + 1}: ${job.title}`);
      console.log(`📍 Location:`, job.location ? JSON.stringify(job.location, null, 2) : 'No location');
      if (job.distance !== undefined) {
        console.log(`📏 Distance: ${job.distance.toFixed(2)}km`);
      }
    });
  } else {
    console.error('❌ Failed to search jobs by location');
    console.log('Response:', JSON.stringify(searchResponse, null, 2));
  }
}

// Main test execution
async function runAllTests() {
  console.log('🚀 Starting Business Address Integration Tests\n');
  console.log('=' * 50);
  
  try {
    // Test 1: Business address integration in job creation
    const testJobs = await testBusinessAddressIntegration();
    
    // Test 2: Job fetching for different user types
    await testJobFetchingForEmployeeAndWorker(testJobs);
    
    // Test 3: Job listing with location data
    await testJobListingWithLocation();
    
    // Test 4: Location-based job search
    await testLocationBasedJobSearch();
    
    console.log('\n' + '=' * 50);
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error.message);
    console.error(error.stack);
  }
}

// Helper function to test specific scenarios
async function quickTest() {
  console.log('🔍 Quick Test: Business Address Auto-Population\n');
  
  // Just test the core functionality
  const result = await testBusinessAddressIntegration();
  
  if (result) {
    console.log('\n✅ Quick test completed successfully!');
    console.log('📊 Summary:');
    console.log(`- Business: ${result.business.name}`);
    console.log(`- Auto-address job: ${result.businessAddressJob.title}`);
    console.log(`- Custom-address job: ${result.customAddressJob.title}`);
  }
}

// Export functions for individual testing
module.exports = {
  runAllTests,
  quickTest,
  testBusinessAddressIntegration,
  testJobFetchingForEmployeeAndWorker,
  testJobListingWithLocation,
  testLocationBasedJobSearch
};

// Run tests if called directly
if (require.main === module) {
  const testType = process.argv[2];
  
  if (testType === 'quick') {
    quickTest();
  } else {
    runAllTests();
  }
}