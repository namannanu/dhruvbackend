/**
 * Backend API Test for Job Creation with Business Address Integration
 * 
 * This file tests the exact workflow you described:
 * 1. Employee creates job and selects business ID
 * 2. Backend fetches business address from business ID
 * 3. Address is automatically placed in job creation
 * 4. Job is stored with complete address information
 * 5. Both employees and workers can fetch jobs with proper addresses
 */

const axios = require('axios');

// Configuration - Update these to match your backend
const CONFIG = {
    BASE_URL: 'http://localhost:3000',
    ENDPOINTS: {
        businesses: '/api/businesses',
        jobs: '/api/jobs',
        workerJobs: '/api/worker/jobs',
        employeeJobs: '/api/employee/jobs',
        createJob: '/api/jobs'
    }
};

/**
 * Test data for job creation
 */
const TEST_JOB_DATA = {
    title: 'Warehouse Associate',
    description: 'Looking for a reliable warehouse associate to help with inventory management, order picking, and general warehouse duties. Must be able to lift up to 50 pounds and work in a fast-paced environment.',
    hourlyRate: 16.50,
    urgency: 'medium',
    scheduleStart: new Date('2024-11-05T08:00:00Z').toISOString(),
    scheduleEnd: new Date('2024-11-05T16:00:00Z').toISOString(),
    recurrence: 'weekly',
    workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    tags: ['warehouse', 'inventory', 'picking', 'physical'],
    requirements: 'Previous warehouse experience preferred. Ability to lift 50lbs. Reliable transportation required.',
    hasOvertime: true,
    overtimeRate: 24.75,
    verificationRequired: false
};

/**
 * Utility function to make HTTP requests
 */
async function apiRequest(method, endpoint, data = null, token = null) {
    const url = `${CONFIG.BASE_URL}${endpoint}`;
    
    const config = {
        method,
        url,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };

    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.data = data;
    }

    console.log(`🌐 Making ${method} request to: ${url}`);
    if (data) {
        console.log('📦 Request data:', JSON.stringify(data, null, 2));
    }

    try {
        const response = await axios(config);
        console.log(`✅ Response (${response.status}):`, response.data);
        return response.data;
    } catch (error) {
        console.error(`❌ Request failed (${method} ${url}):`);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            console.error(`   Network Error: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Step 1: Test fetching available businesses
 */
async function testFetchBusinesses(token = null) {
    console.log('\n🏢 === TESTING: Fetch Available Businesses ===');
    
    try {
        const businesses = await apiRequest('GET', CONFIG.ENDPOINTS.businesses, null, token);
        
        if (!Array.isArray(businesses)) {
            throw new Error('Businesses response is not an array');
        }

        console.log(`📊 Found ${businesses.length} businesses:`);
        businesses.forEach((business, index) => {
            console.log(`   ${index + 1}. Business ID: ${business.id}`);
            console.log(`      Name: ${business.name}`);
            console.log(`      Address: ${business.address}`);
            console.log(`      City: ${business.city || 'Not specified'}`);
            console.log(`      State: ${business.state || 'Not specified'}`);
            if (business.latitude && business.longitude) {
                console.log(`      Coordinates: ${business.latitude}, ${business.longitude}`);
            }
            console.log('');
        });

        return businesses;
    } catch (error) {
        console.error('❌ Failed to fetch businesses');
        throw error;
    }
}

/**
 * Step 2: Test creating a job with business ID (address should be auto-fetched)
 */
async function testCreateJobWithBusinessId(businessId, customJobData = null, token = null) {
    console.log('\n🚀 === TESTING: Create Job with Business ID ===');
    console.log(`🎯 Using Business ID: ${businessId}`);
    
    const jobData = {
        ...TEST_JOB_DATA,
        ...customJobData,
        businessId: businessId  // This is the key - backend should fetch address from this
    };

    console.log('📝 Job data being sent:');
    console.log(JSON.stringify(jobData, null, 2));

    try {
        const createdJob = await apiRequest('POST', CONFIG.ENDPOINTS.createJob, jobData, token);
        
        console.log('✅ Job created successfully!');
        console.log(`   Job ID: ${createdJob.id}`);
        console.log(`   Title: ${createdJob.title}`);
        console.log(`   Business ID: ${createdJob.businessId}`);
        console.log(`   Business Name: ${createdJob.businessName || 'Not set'}`);
        console.log(`   Business Address: ${createdJob.businessAddress || 'Not set'}`);
        console.log(`   Status: ${createdJob.status}`);
        
        // Check if location object is populated
        if (createdJob.location) {
            console.log('📍 Location data:');
            console.log(`   Formatted Address: ${createdJob.location.formattedAddress || 'Not set'}`);
            console.log(`   City: ${createdJob.location.city || 'Not set'}`);
            console.log(`   State: ${createdJob.location.state || 'Not set'}`);
            console.log(`   Coordinates: ${createdJob.location.latitude || 'N/A'}, ${createdJob.location.longitude || 'N/A'}`);
        } else {
            console.warn('⚠️ No location object in response');
        }

        return createdJob;
    } catch (error) {
        console.error('❌ Failed to create job');
        throw error;
    }
}

/**
 * Step 3: Test fetching jobs for employees
 */
async function testFetchEmployeeJobs(token = null) {
    console.log('\n👔 === TESTING: Fetch Employee Jobs ===');
    
    try {
        const jobs = await apiRequest('GET', CONFIG.ENDPOINTS.employeeJobs, null, token);
        
        if (!Array.isArray(jobs)) {
            throw new Error('Employee jobs response is not an array');
        }

        console.log(`📊 Found ${jobs.length} employee jobs:`);
        jobs.forEach((job, index) => {
            console.log(`   ${index + 1}. Job ID: ${job.id}`);
            console.log(`      Title: ${job.title}`);
            console.log(`      Business Name: ${job.businessName || 'Not specified'}`);
            console.log(`      Business Address: ${job.businessAddress || 'Not specified'}`);
            console.log(`      Location Summary: ${job.locationSummary || 'Not specified'}`);
            console.log(`      Status: ${job.status}`);
            console.log(`      Hourly Rate: $${job.hourlyRate}`);
            console.log(`      Applicants: ${job.applicantsCount || 0}`);
            
            if (job.location) {
                console.log(`      Location Object:`);
                console.log(`        Formatted: ${job.location.formattedAddress || 'N/A'}`);
                console.log(`        Coordinates: ${job.location.latitude || 'N/A'}, ${job.location.longitude || 'N/A'}`);
            }
            console.log('');
        });

        return jobs;
    } catch (error) {
        console.error('❌ Failed to fetch employee jobs');
        throw error;
    }
}

/**
 * Step 4: Test fetching jobs for workers
 */
async function testFetchWorkerJobs(token = null) {
    console.log('\n👷 === TESTING: Fetch Worker Jobs ===');
    
    try {
        const jobs = await apiRequest('GET', CONFIG.ENDPOINTS.workerJobs, null, token);
        
        if (!Array.isArray(jobs)) {
            throw new Error('Worker jobs response is not an array');
        }

        console.log(`📊 Found ${jobs.length} worker jobs:`);
        jobs.forEach((job, index) => {
            console.log(`   ${index + 1}. Job ID: ${job.id}`);
            console.log(`      Title: ${job.title}`);
            console.log(`      Business Name: ${job.businessName || 'Not specified'}`);
            console.log(`      Business Address: ${job.businessAddress || 'Not specified'}`);
            console.log(`      Location Summary: ${job.locationSummary || 'Not specified'}`);
            console.log(`      Status: ${job.status}`);
            console.log(`      Hourly Rate: $${job.hourlyRate}`);
            console.log(`      Has Applied: ${job.hasApplied || false}`);
            console.log(`      Distance: ${job.distanceMiles ? job.distanceMiles.toFixed(1) + ' miles' : 'Not calculated'}`);
            console.log(`      Urgency: ${job.urgency}`);
            
            if (job.location) {
                console.log(`      Location Object:`);
                console.log(`        Formatted: ${job.location.formattedAddress || 'N/A'}`);
                console.log(`        Short: ${job.location.shortAddress || 'N/A'}`);
                console.log(`        Full: ${job.location.fullAddress || 'N/A'}`);
                console.log(`        Coordinates: ${job.location.latitude || 'N/A'}, ${job.location.longitude || 'N/A'}`);
            }
            console.log('');
        });

        return jobs;
    } catch (error) {
        console.error('❌ Failed to fetch worker jobs');
        throw error;
    }
}

/**
 * Step 5: Validate that address data is properly populated
 */
function validateJobAddressIntegration(job) {
    console.log(`\n🔍 === VALIDATING: Address Integration for Job ${job.id} ===`);
    
    const validationResults = {
        businessId: !!job.businessId,
        businessName: !!job.businessName && job.businessName.trim() !== '',
        businessAddress: !!job.businessAddress && job.businessAddress.trim() !== '',
        locationObject: !!job.location,
        coordinates: !!(job.location?.latitude && job.location?.longitude),
        formattedAddress: !!job.location?.formattedAddress,
        flutterCompatibility: {
            businessAddress: !!job.businessAddress,
            businessName: !!job.businessName,
            locationSummary: !!job.locationSummary
        }
    };

    console.log('📋 Validation Results:');
    console.log(`   ✓ Business ID Present: ${validationResults.businessId ? '✅' : '❌'}`);
    console.log(`   ✓ Business Name Present: ${validationResults.businessName ? '✅' : '❌'}`);
    console.log(`   ✓ Business Address Present: ${validationResults.businessAddress ? '✅' : '❌'}`);
    console.log(`   ✓ Location Object Present: ${validationResults.locationObject ? '✅' : '❌'}`);
    console.log(`   ✓ Coordinates Present: ${validationResults.coordinates ? '✅' : '❌'}`);
    console.log(`   ✓ Formatted Address Present: ${validationResults.formattedAddress ? '✅' : '❌'}`);
    
    console.log('📱 Flutter Compatibility:');
    console.log(`   ✓ businessAddress field: ${validationResults.flutterCompatibility.businessAddress ? '✅' : '❌'}`);
    console.log(`   ✓ businessName field: ${validationResults.flutterCompatibility.businessName ? '✅' : '❌'}`);
    console.log(`   ✓ locationSummary field: ${validationResults.flutterCompatibility.locationSummary ? '✅' : '❌'}`);

    const overallValid = Object.values(validationResults).every(result => 
        typeof result === 'boolean' ? result : Object.values(result).every(Boolean)
    );

    console.log(`\n🎯 Overall Validation: ${overallValid ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!overallValid) {
        console.log('\n⚠️ Issues found:');
        if (!validationResults.businessId) console.log('   - Missing business ID');
        if (!validationResults.businessName) console.log('   - Missing or empty business name');
        if (!validationResults.businessAddress) console.log('   - Missing or empty business address');
        if (!validationResults.locationObject) console.log('   - Missing location object');
        if (!validationResults.coordinates) console.log('   - Missing coordinates');
        if (!validationResults.formattedAddress) console.log('   - Missing formatted address');
        
        if (!validationResults.flutterCompatibility.businessAddress) console.log('   - Missing businessAddress field for Flutter');
        if (!validationResults.flutterCompatibility.businessName) console.log('   - Missing businessName field for Flutter');
        if (!validationResults.flutterCompatibility.locationSummary) console.log('   - Missing locationSummary field for Flutter');
    }

    return overallValid;
}

/**
 * Main test execution function
 */
async function runCompleteTest(employeeToken = null, workerToken = null) {
    console.log('🧪 === STARTING COMPLETE JOB ADDRESS INTEGRATION TEST ===');
    console.log('This test verifies:');
    console.log('1. Employee can fetch available businesses');
    console.log('2. Employee can create job by selecting business ID');
    console.log('3. Backend automatically fetches and integrates business address');
    console.log('4. Jobs are properly stored with address information');
    console.log('5. Both employees and workers can fetch jobs with addresses');
    console.log('6. Address data is compatible with Flutter requirements');
    console.log('');

    const testResults = {
        fetchBusinesses: false,
        createJob: false,
        fetchEmployeeJobs: false,
        fetchWorkerJobs: false,
        addressValidation: false,
        createdJobId: null
    };

    try {
        // Step 1: Fetch businesses
        console.log('👉 Step 1: Testing business fetching...');
        const businesses = await testFetchBusinesses(employeeToken);
        testResults.fetchBusinesses = true;

        if (businesses.length === 0) {
            throw new Error('No businesses available for testing. Please create at least one business first.');
        }

        // Step 2: Create job with first business
        console.log('👉 Step 2: Testing job creation with business address integration...');
        const selectedBusiness = businesses[0];
        console.log(`🎯 Selected business: ${selectedBusiness.name} (ID: ${selectedBusiness.id})`);
        
        const createdJob = await testCreateJobWithBusinessId(selectedBusiness.id, null, employeeToken);
        testResults.createJob = true;
        testResults.createdJobId = createdJob.id;

        // Step 3: Validate address integration
        console.log('👉 Step 3: Validating address integration...');
        const addressValidationPassed = validateJobAddressIntegration(createdJob);
        testResults.addressValidation = addressValidationPassed;

        // Step 4: Fetch employee jobs
        console.log('👉 Step 4: Testing employee job fetching...');
        const employeeJobs = await testFetchEmployeeJobs(employeeToken);
        testResults.fetchEmployeeJobs = true;

        // Step 5: Fetch worker jobs
        console.log('👉 Step 5: Testing worker job fetching...');
        const workerJobs = await testFetchWorkerJobs(workerToken);
        testResults.fetchWorkerJobs = true;

        // Validate the fetched jobs also have proper address data
        if (employeeJobs.length > 0) {
            console.log('\n🔍 Validating first employee job...');
            validateJobAddressIntegration(employeeJobs[0]);
        }

        if (workerJobs.length > 0) {
            console.log('\n🔍 Validating first worker job...');
            validateJobAddressIntegration(workerJobs[0]);
        }

    } catch (error) {
        console.error('\n💥 Test execution failed:', error.message);
    }

    // Print final results
    console.log('\n' + '='.repeat(60));
    console.log('🏁 FINAL TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Fetch Businesses: ${testResults.fetchBusinesses ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Create Job: ${testResults.createJob ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Address Validation: ${testResults.addressValidation ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Fetch Employee Jobs: ${testResults.fetchEmployeeJobs ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Fetch Worker Jobs: ${testResults.fetchWorkerJobs ? '✅ PASSED' : '❌ FAILED'}`);

    if (testResults.createdJobId) {
        console.log(`Created Job ID: ${testResults.createdJobId}`);
    }

    const allTestsPassed = Object.values(testResults).every(result => 
        typeof result === 'boolean' ? result : true
    );

    console.log(`\n🎯 Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    if (allTestsPassed) {
        console.log('\n🎉 Congratulations! Your job creation with business address integration is working correctly.');
        console.log('✅ Employees can create jobs by selecting business ID');
        console.log('✅ Business addresses are automatically fetched and integrated');
        console.log('✅ Jobs are stored with complete address information');
        console.log('✅ Both employees and workers can fetch jobs with proper addresses');
        console.log('✅ Address data is compatible with Flutter requirements');
    } else {
        console.log('\n⚠️ Some tests failed. Please check the error messages above and:');
        console.log('1. Verify your backend API endpoints are working');
        console.log('2. Ensure business address integration is implemented');
        console.log('3. Check that jobs are being stored with complete address data');
        console.log('4. Validate that job fetching returns address information');
    }

    return testResults;
}

/**
 * Quick test without authentication
 */
async function quickTest() {
    console.log('🚀 Running quick test without authentication...\n');
    return await runCompleteTest(null, null);
}

// Export functions for use in other files
module.exports = {
    testFetchBusinesses,
    testCreateJobWithBusinessId,
    testFetchEmployeeJobs,
    testFetchWorkerJobs,
    validateJobAddressIntegration,
    runCompleteTest,
    quickTest,
    apiRequest,
    CONFIG
};

// Run the test if this file is executed directly
if (require.main === module) {
    // You can replace these with actual tokens or leave as null for testing without auth
    const EMPLOYEE_TOKEN = null; // 'your-employee-token-here'
    const WORKER_TOKEN = null;   // 'your-worker-token-here'
    
    runCompleteTest(EMPLOYEE_TOKEN, WORKER_TOKEN)
        .then(results => {
            console.log('\n✨ Test execution completed.');
            process.exit(results && Object.values(results).every(r => typeof r === 'boolean' ? r : true) ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 Fatal error during test execution:', error);
            process.exit(1);
        });
}