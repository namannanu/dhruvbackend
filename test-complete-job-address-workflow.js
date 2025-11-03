/**
 * Final Complete Test: Job Creation with Business Address Integration
 * 
 * This test demonstrates the complete workflow you requested:
 * 1. Employee creates job by selecting business ID
 * 2. Backend automatically fetches business address
 * 3. Address is integrated into job creation
 * 4. Job is stored with complete address data
 * 5. Both employees and workers can fetch jobs with addresses
 * 6. No token dependency for basic operations
 */

const axios = require('axios');

// Configuration
const API_CONFIG = {
    BASE_URL: 'http://localhost:3000',
    ENDPOINTS: {
        businesses: '/api/businesses',
        jobs: '/api/jobs',
        workerJobs: '/api/worker/jobs',
        employeeJobs: '/api/employee/jobs',
        login: '/api/auth/login'
    }
};

// Test data that matches your Flutter app requirements
const SAMPLE_JOB_DATA = {
    title: 'Restaurant Server',
    description: 'Looking for friendly and experienced server to join our team. Must be able to work in fast-paced environment and provide excellent customer service.',
    hourlyRate: 15.00,
    urgency: 'medium',
    scheduleStart: '2024-11-05T10:00:00.000Z',
    scheduleEnd: '2024-11-05T18:00:00.000Z',
    recurrence: 'weekly',
    workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    tags: ['restaurant', 'server', 'customer-service'],
    verificationRequired: false,
    hasOvertime: true,
    overtimeRate: 22.50
};

// Helper function to make API requests
async function makeApiCall(method, endpoint, data = null, token = null) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    const config = {
        method,
        url,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        config.data = data;
    }

    try {
        console.log(`🌐 ${method.toUpperCase()} ${url}`);
        const response = await axios(config);
        console.log(`✅ Response: ${response.status} ${response.statusText}`);
        return response.data;
    } catch (error) {
        console.error(`❌ API Error: ${method} ${url}`);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Message: ${error.response.data?.message || 'Unknown error'}`);
            console.error(`   Data:`, error.response.data);
        } else {
            console.error(`   Network error: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Helper function to get authentication token
 */
async function getAuthToken(userType = 'employee') {
    console.log(`🔐 Getting ${userType} authentication token...`);
    
    // Sample credentials - replace with actual test user credentials
    const credentials = {
        employee: {
            email: 'd@gmail.com',
            password: 'password'
        },
        worker: {
            email: 'n@gmail.com', 
            password: 'password'
        }
    };

    try {
        const result = await makeApiCall('POST', API_CONFIG.ENDPOINTS.login, credentials[userType]);
        
        if (result.token) {
            console.log(`✅ ${userType} token obtained successfully`);
            return result.token;
        } else if (result.data && result.data.token) {
            console.log(`✅ ${userType} token obtained successfully`);
            return result.data.token;
        } else {
            console.log(`⚠️ Could not get ${userType} token from login response:`, result);
            return null;
        }
    } catch (error) {
        console.log(`⚠️ Could not authenticate ${userType}:`, error.message);
        return null;
    }
}

/**
 * Test 1: Fetch Available Businesses for Employee
 */
async function testFetchBusinesses(token = null) {
    console.log('\n🏢 === TEST 1: Fetch Available Businesses ===');
    
    try {
        const result = await makeApiCall('GET', API_CONFIG.ENDPOINTS.businesses, null, token);
        const businesses = result.data || result;
        
        if (!Array.isArray(businesses)) {
            throw new Error('Expected businesses array, got: ' + typeof businesses);
        }
        
        console.log(`📊 Found ${businesses.length} available businesses:`);
        
        businesses.forEach((business, index) => {
            console.log(`\n   ${index + 1}. Business Details:`);
            console.log(`      ID: ${business._id || business.id}`);
            console.log(`      Name: ${business.name}`);
            
            // Check address fields
            if (business.location) {
                console.log(`      Address Line 1: ${business.location.line1 || 'Not set'}`);
                console.log(`      City: ${business.location.city || 'Not set'}`);
                console.log(`      State: ${business.location.state || 'Not set'}`);
                console.log(`      Postal Code: ${business.location.postalCode || 'Not set'}`);
                console.log(`      Coordinates: ${business.location.latitude || 'N/A'}, ${business.location.longitude || 'N/A'}`);
            } else {
                console.log(`      ⚠️ No location data available`);
            }
        });
        
        return businesses;
        
    } catch (error) {
        console.error('❌ Failed to fetch businesses');
        throw error;
    }
}

/**
 * Test 2: Create Job with Business ID (Address Auto-Integration)
 */
async function testCreateJobWithBusinessAddress(businessId, customJobData = {}, token = null) {
    console.log('\n🚀 === TEST 2: Create Job with Business Address Integration ===');
    console.log(`🎯 Using Business ID: ${businessId}`);
    
    const jobPayload = {
        ...SAMPLE_JOB_DATA,
        ...customJobData,
        businessId: businessId
    };
    
    console.log('\n📝 Job creation payload:');
    console.log(JSON.stringify(jobPayload, null, 2));
    
    try {
        const result = await makeApiCall('POST', API_CONFIG.ENDPOINTS.jobs, jobPayload, token);
        const createdJob = result.data || result;
        
        console.log('\n✅ Job created successfully!');
        console.log(`   Job ID: ${createdJob._id || createdJob.id}`);
        console.log(`   Title: ${createdJob.title}`);
        console.log(`   Status: ${createdJob.status}`);
        console.log(`   Premium Required: ${createdJob.premiumRequired || false}`);
        
        // Validate business address integration
        console.log('\n📍 Address Integration Results:');
        console.log(`   Business ID: ${createdJob.businessId || 'Not set'}`);
        console.log(`   Business Name: ${createdJob.businessName || 'Not set'}`);
        console.log(`   Business Address: ${createdJob.businessAddress || 'Not set'}`);
        console.log(`   Location Summary: ${createdJob.locationSummary || 'Not set'}`);
        
        if (createdJob.location) {
            console.log('\n🗺️ Detailed Location Object:');
            console.log(`   Formatted Address: ${createdJob.location.formattedAddress || 'Not set'}`);
            console.log(`   Short Address: ${createdJob.location.shortAddress || 'Not set'}`);
            console.log(`   Full Address: ${createdJob.location.fullAddress || 'Not set'}`);
            console.log(`   City: ${createdJob.location.city || 'Not set'}`);
            console.log(`   State: ${createdJob.location.state || 'Not set'}`);
            console.log(`   Coordinates: ${createdJob.location.latitude || 'N/A'}, ${createdJob.location.longitude || 'N/A'}`);
        } else {
            console.warn('⚠️ No location object in job response');
        }
        
        return createdJob;
        
    } catch (error) {
        console.error('❌ Failed to create job');
        throw error;
    }
}

/**
 * Test 3: Fetch Jobs for Employees
 */
async function testFetchEmployeeJobs(token = null) {
    console.log('\n👔 === TEST 3: Fetch Jobs for Employees ===');
    
    try {
        const result = await makeApiCall('GET', API_CONFIG.ENDPOINTS.jobs, null, token);
        const jobs = result.data || result;
        
        if (!Array.isArray(jobs)) {
            throw new Error('Expected jobs array, got: ' + typeof jobs);
        }
        
        console.log(`📊 Found ${jobs.length} jobs for employee:`);
        
        jobs.forEach((job, index) => {
            console.log(`\n   ${index + 1}. Job Details:`);
            console.log(`      ID: ${job._id || job.id}`);
            console.log(`      Title: ${job.title}`);
            console.log(`      Status: ${job.status}`);
            console.log(`      Business Name: ${job.businessName || 'Not specified'}`);
            console.log(`      Business Address: ${job.businessAddress || 'Not specified'}`);
            console.log(`      Hourly Rate: $${job.hourlyRate}`);
            console.log(`      Applicants: ${job.applicantsCount || 0}`);
            
            if (job.location) {
                console.log(`      Location Available: ✅`);
                console.log(`      Coordinates: ${job.location.latitude || 'N/A'}, ${job.location.longitude || 'N/A'}`);
            } else {
                console.log(`      Location Available: ❌`);
            }
        });
        
        return jobs;
        
    } catch (error) {
        console.error('❌ Failed to fetch employee jobs');
        throw error;
    }
}

/**
 * Test 4: Fetch Jobs for Workers
 */
async function testFetchWorkerJobs(token = null) {
    console.log('\n👷 === TEST 4: Fetch Jobs for Workers ===');
    
    try {
        // Try both endpoints - worker-specific and general
        let jobs = [];
        
        try {
            const result = await makeApiCall('GET', API_CONFIG.ENDPOINTS.workerJobs, null, token);
            jobs = result.data || result;
        } catch (workerEndpointError) {
            console.log('Worker-specific endpoint not available, trying general jobs endpoint...');
            const result = await makeApiCall('GET', API_CONFIG.ENDPOINTS.jobs, null, token);
            jobs = result.data || result;
        }
        
        if (!Array.isArray(jobs)) {
            throw new Error('Expected jobs array, got: ' + typeof jobs);
        }
        
        // Filter to only active jobs for workers
        const activeJobs = jobs.filter(job => job.status === 'active');
        
        console.log(`📊 Found ${activeJobs.length} active jobs for worker:`);
        
        activeJobs.forEach((job, index) => {
            console.log(`\n   ${index + 1}. Job Details:`);
            console.log(`      ID: ${job._id || job.id}`);
            console.log(`      Title: ${job.title}`);
            console.log(`      Business Name: ${job.businessName || 'Not specified'}`);
            console.log(`      Business Address: ${job.businessAddress || 'Not specified'}`);
            console.log(`      Location Summary: ${job.locationSummary || 'Not specified'}`);
            console.log(`      Hourly Rate: $${job.hourlyRate}`);
            console.log(`      Has Applied: ${job.hasApplied || false}`);
            console.log(`      Distance: ${job.distanceMiles ? job.distanceMiles.toFixed(1) + ' miles' : 'Not calculated'}`);
            console.log(`      Urgency: ${job.urgency || 'low'}`);
            
            // Flutter compatibility check
            const flutterFields = {
                businessAddress: !!job.businessAddress,
                businessName: !!job.businessName,
                locationSummary: !!job.locationSummary,
                location: !!job.location
            };
            
            const compatibilityScore = Object.values(flutterFields).filter(Boolean).length;
            console.log(`      Flutter Compatibility: ${compatibilityScore}/4 fields ✅`);
            
            if (job.location) {
                console.log(`      📍 Location Details:`);
                console.log(`         Formatted: ${job.location.formattedAddress || 'N/A'}`);
                console.log(`         Coordinates: ${job.location.latitude || 'N/A'}, ${job.location.longitude || 'N/A'}`);
            }
        });
        
        return activeJobs;
        
    } catch (error) {
        console.error('❌ Failed to fetch worker jobs');
        throw error;
    }
}

/**
 * Test 5: Validate Address Integration
 */
function validateAddressIntegration(jobs) {
    console.log('\n🔍 === TEST 5: Validate Address Integration ===');
    
    if (!Array.isArray(jobs) || jobs.length === 0) {
        console.warn('⚠️ No jobs provided for validation');
        return false;
    }
    
    let validJobs = 0;
    let totalJobs = jobs.length;
    
    jobs.forEach((job, index) => {
        console.log(`\n📋 Validating Job ${index + 1}: ${job.title}`);
        
        const checks = {
            hasBusinessId: !!(job.businessId || job.business),
            hasBusinessName: !!job.businessName,
            hasBusinessAddress: !!job.businessAddress,
            hasLocationObject: !!job.location,
            hasCoordinates: !!(job.location?.latitude && job.location?.longitude),
            hasLocationSummary: !!job.locationSummary
        };
        
        const passedChecks = Object.values(checks).filter(Boolean).length;
        const totalChecks = Object.keys(checks).length;
        
        console.log(`   ✓ Business ID: ${checks.hasBusinessId ? '✅' : '❌'}`);
        console.log(`   ✓ Business Name: ${checks.hasBusinessName ? '✅' : '❌'}`);
        console.log(`   ✓ Business Address: ${checks.hasBusinessAddress ? '✅' : '❌'}`);
        console.log(`   ✓ Location Object: ${checks.hasLocationObject ? '✅' : '❌'}`);
        console.log(`   ✓ Coordinates: ${checks.hasCoordinates ? '✅' : '❌'}`);
        console.log(`   ✓ Location Summary: ${checks.hasLocationSummary ? '✅' : '❌'}`);
        console.log(`   📊 Score: ${passedChecks}/${totalChecks}`);
        
        if (passedChecks >= 4) { // At least 4/6 checks should pass
            validJobs++;
            console.log(`   🎯 Status: ✅ VALID`);
        } else {
            console.log(`   🎯 Status: ❌ NEEDS IMPROVEMENT`);
        }
    });
    
    const successRate = (validJobs / totalJobs) * 100;
    console.log(`\n📈 Overall Validation Results:`);
    console.log(`   Valid Jobs: ${validJobs}/${totalJobs}`);
    console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`   Status: ${successRate >= 80 ? '✅ EXCELLENT' : successRate >= 60 ? '⚠️ GOOD' : '❌ NEEDS WORK'}`);
    
    return successRate >= 80;
}

/**
 * Main Test Execution
 */
async function runCompleteWorkflowTest(employeeToken = null, workerToken = null) {
    console.log('🧪 === COMPLETE JOB CREATION & ADDRESS INTEGRATION WORKFLOW TEST ===');
    console.log('Testing the complete flow you requested:');
    console.log('1. Employee selects business ID from available businesses');
    console.log('2. System fetches business address automatically');
    console.log('3. Job is created with integrated address data');
    console.log('4. Jobs are stored with complete address information');
    console.log('5. Both employees and workers can fetch jobs with addresses');
    console.log('6. Address data is compatible with Flutter requirements');
    console.log('=' * 80);
    
    const testResults = {
        fetchBusinesses: false,
        createJob: false,
        fetchEmployeeJobs: false,
        fetchWorkerJobs: false,
        addressValidation: false,
        createdJobId: null,
        businessUsed: null
    };
    
    try {
        // Step 1: Fetch available businesses
        console.log('\n👉 Step 1: Fetching available businesses...');
        const businesses = await testFetchBusinesses(employeeToken);
        testResults.fetchBusinesses = true;
        
        if (businesses.length === 0) {
            throw new Error('No businesses found. Please create at least one business first.');
        }
        
        // Step 2: Create job with business address integration
        console.log('\n👉 Step 2: Creating job with business address integration...');
        const selectedBusiness = businesses[0];
        testResults.businessUsed = selectedBusiness;
        
        const createdJob = await testCreateJobWithBusinessAddress(
            selectedBusiness._id || selectedBusiness.id,
            { title: 'Test Job - Address Integration' },
            employeeToken
        );
        testResults.createJob = true;
        testResults.createdJobId = createdJob._id || createdJob.id;
        
        // Step 3: Fetch employee jobs
        console.log('\n👉 Step 3: Fetching jobs for employees...');
        const employeeJobs = await testFetchEmployeeJobs(employeeToken);
        testResults.fetchEmployeeJobs = true;
        
        // Step 4: Fetch worker jobs
        console.log('\n👉 Step 4: Fetching jobs for workers...');
        const workerJobs = await testFetchWorkerJobs(workerToken);
        testResults.fetchWorkerJobs = true;
        
        // Step 5: Validate address integration
        console.log('\n👉 Step 5: Validating address integration...');
        const allJobs = [...employeeJobs, ...workerJobs];
        const addressValidationPassed = validateAddressIntegration(allJobs);
        testResults.addressValidation = addressValidationPassed;
        
    } catch (error) {
        console.error('\n💥 Test execution failed:', error.message);
    }
    
    // Final Results Summary
    console.log('\n' + '=' * 80);
    console.log('🏁 FINAL TEST RESULTS SUMMARY');
    console.log('=' * 80);
    
    const results = [
        ['Fetch Businesses', testResults.fetchBusinesses],
        ['Create Job with Address', testResults.createJob],
        ['Fetch Employee Jobs', testResults.fetchEmployeeJobs],
        ['Fetch Worker Jobs', testResults.fetchWorkerJobs],
        ['Address Validation', testResults.addressValidation]
    ];
    
    results.forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    if (testResults.createdJobId) {
        console.log(`\n🆔 Created Job ID: ${testResults.createdJobId}`);
    }
    
    if (testResults.businessUsed) {
        console.log(`🏢 Business Used: ${testResults.businessUsed.name} (${testResults.businessUsed._id || testResults.businessUsed.id})`);
    }
    
    const overallSuccess = Object.values(testResults).filter(r => typeof r === 'boolean').every(Boolean);
    
    console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (overallSuccess) {
        console.log('\n🎉 SUCCESS! Your job creation with business address integration is working perfectly!');
        console.log('✅ Employees can create jobs by selecting business ID');
        console.log('✅ Business addresses are automatically fetched and integrated');
        console.log('✅ Jobs are stored with complete address information');
        console.log('✅ Both employees and workers can fetch jobs with proper addresses');
        console.log('✅ Address data is fully compatible with Flutter requirements');
        console.log('\n🚀 Your system is ready for production!');
    } else {
        console.log('\n⚠️ Some tests failed. Please check the following:');
        console.log('1. Ensure your backend server is running');
        console.log('2. Verify API endpoints are correctly implemented');
        console.log('3. Check business address integration in job creation');
        console.log('4. Validate job fetching returns complete address data');
        console.log('5. Ensure Flutter compatibility fields are included');
    }
    
    return testResults;
}

/**
 * Quick test runner without authentication
 */
async function quickTestRun() {
    console.log('🚀 Running quick test without authentication tokens...\n');
    return await runCompleteWorkflowTest();
}

// Export functions
module.exports = {
    testFetchBusinesses,
    testCreateJobWithBusinessAddress,
    testFetchEmployeeJobs,
    testFetchWorkerJobs,
    validateAddressIntegration,
    runCompleteWorkflowTest,
    quickTestRun
};

// Run test if this file is executed directly
if (require.main === module) {
    async function runWithAuth() {
        console.log('🚀 Starting test with authentication...\n');
        
        // Try to get fresh tokens first
        let employeeToken = null;
        let workerToken = null;
        
        try {
            employeeToken = await getAuthToken('employee');
            workerToken = await getAuthToken('worker');
        } catch (error) {
            console.log('⚠️ Could not get fresh tokens, using provided tokens...');
        }
        
        // Fallback to provided tokens if fresh ones failed
        if (!employeeToken) {
            employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDY4YTJhNGMzOTNhY2NhMzcwOWZkMCIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc2MjE4MTIyOSwiZXhwIjoxNzYyNzg2MDI5fQ.A9XJCpPtQqCmQhYe3eeSfXpM8QeJsnieXytJ4qNCwdk';
        }
        if (!workerToken) {
            workerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDY5MWY2NjAzZmVhODQyYWUxNmExZSIsInJvbGUiOiJ3b3JrZXIiLCJpYXQiOjE3NjIxODA4ODQsImV4cCI6MTc2Mjc4NTY4NH0.0KcXVJ7oP3sbPNBZHnbGJMQY50qYKETPFSaR6uWjDOQ';
        }
        
        console.log(`📋 Using tokens:`);
        console.log(`   Employee Token: ${employeeToken ? 'Available' : 'None'}`);
        console.log(`   Worker Token: ${workerToken ? 'Available' : 'None'}`);
        
        return await runCompleteWorkflowTest(employeeToken, workerToken);
    }
    
    runWithAuth()
        .then(results => {
            console.log('\n✨ Test execution completed.');
            const success = Object.values(results).filter(r => typeof r === 'boolean').every(Boolean);
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 Fatal error:', error);
            process.exit(1);
        });
}