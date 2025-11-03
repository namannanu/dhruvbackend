/**
 * Complete Job Creation and Fetching System with Business Address Integration
 * 
 * This file demonstrates:
 * 1. Employee creates job by selecting business ID
 * 2. System fetches business address and integrates it into job creation
 * 3. Job is stored with complete address information
 * 4. Both employees and workers can fetch jobs with proper address data
 * 5. Address validation and formatting
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Adjust to your API base URL
const API_ENDPOINTS = {
    businesses: '/api/businesses',
    jobs: '/api/jobs',
    workerJobs: '/api/worker/jobs',
    employeeJobs: '/api/employee/jobs'
};

// Test data for job creation
const TEST_JOB_DATA = {
    title: 'Warehouse Worker',
    description: 'Need experienced warehouse worker for inventory management and order fulfillment',
    hourlyRate: 18.50,
    urgency: 'medium',
    scheduleStart: new Date('2024-11-04T09:00:00Z'),
    scheduleEnd: new Date('2024-11-04T17:00:00Z'),
    recurrence: 'weekly',
    workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    tags: ['warehouse', 'inventory', 'full-time'],
    requirements: 'Previous warehouse experience preferred, ability to lift 50lbs, forklift certification a plus'
};

// Test tokens (replace with actual tokens)
const TEST_TOKENS = {
    employee: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // Employee token
    worker: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',   // Worker token
    admin: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'     // Admin token (optional)
};

/**
 * Utility function to make API requests
 */
async function makeRequest(method, endpoint, data = null, token = null) {
    const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
        config.data = data;
    }

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`❌ API Error (${method} ${endpoint}):`, {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            data: error.response?.data
        });
        throw error;
    }
}

/**
 * Step 1: Fetch available businesses for the employee
 */
async function fetchAvailableBusinesses(employeeToken) {
    console.log('🏢 Fetching available businesses...');
    
    try {
        const businesses = await makeRequest('GET', API_ENDPOINTS.businesses, null, employeeToken);
        
        console.log(`✅ Found ${businesses.length} businesses:`);
        businesses.forEach((business, index) => {
            console.log(`   ${index + 1}. ${business.name}`);
            console.log(`      Address: ${business.address}`);
            console.log(`      ID: ${business.id}`);
            console.log(`      Location: lat=${business.latitude}, lng=${business.longitude}`);
            console.log('');
        });
        
        return businesses;
    } catch (error) {
        console.error('❌ Failed to fetch businesses');
        throw error;
    }
}

/**
 * Step 2: Get detailed business information including full address
 */
async function getBusinessDetails(businessId, token) {
    console.log(`🔍 Fetching details for business ID: ${businessId}`);
    
    try {
        const business = await makeRequest('GET', `${API_ENDPOINTS.businesses}/${businessId}`, null, token);
        
        console.log('✅ Business details retrieved:');
        console.log(`   Name: ${business.name}`);
        console.log(`   Full Address: ${business.address}`);
        console.log(`   City: ${business.city || 'Not specified'}`);
        console.log(`   State: ${business.state || 'Not specified'}`);
        console.log(`   Postal Code: ${business.postalCode || 'Not specified'}`);
        console.log(`   Country: ${business.country || 'Not specified'}`);
        console.log(`   Coordinates: ${business.latitude}, ${business.longitude}`);
        console.log('');
        
        return business;
    } catch (error) {
        console.error('❌ Failed to fetch business details');
        throw error;
    }
}

/**
 * Step 3: Format and validate address for job creation
 */
function formatJobAddress(business, customAddress = null) {
    console.log('📍 Formatting job address...');
    
    // Use custom address if provided, otherwise use business address
    const baseAddress = customAddress || business.address;
    
    // Create comprehensive address object
    const jobAddress = {
        businessId: business.id,
        businessName: business.name,
        formattedAddress: baseAddress,
        streetAddress: business.streetAddress || baseAddress,
        city: business.city,
        state: business.state,
        postalCode: business.postalCode,
        country: business.country || 'United States',
        latitude: business.latitude,
        longitude: business.longitude,
        // Additional fields for Flutter compatibility
        line1: business.streetAddress || baseAddress,
        shortAddress: `${business.city || ''}, ${business.state || ''}`.replace(/^,\s*|,\s*$/g, ''),
        fullAddress: baseAddress,
        label: business.name
    };
    
    console.log('✅ Address formatted:');
    console.log(`   Primary: ${jobAddress.formattedAddress}`);
    console.log(`   Short: ${jobAddress.shortAddress}`);
    console.log(`   Business: ${jobAddress.businessName}`);
    console.log('');
    
    return jobAddress;
}

/**
 * Step 4: Create job with integrated business address
 */
async function createJobWithBusinessAddress(businessId, jobData, customAddress, employeeToken) {
    console.log('🚀 Creating job with business address integration...');
    
    try {
        // Get business details first
        const business = await getBusinessDetails(businessId, employeeToken);
        
        // Format the address
        const addressInfo = formatJobAddress(business, customAddress);
        
        // Prepare job creation payload
        const jobPayload = {
            ...jobData,
            businessId: business.id,
            businessName: business.name,
            businessAddress: addressInfo.formattedAddress,
            location: {
                line1: addressInfo.line1,
                city: addressInfo.city,
                state: addressInfo.state,
                postalCode: addressInfo.postalCode,
                country: addressInfo.country,
                latitude: addressInfo.latitude,
                longitude: addressInfo.longitude,
                formattedAddress: addressInfo.formattedAddress,
                shortAddress: addressInfo.shortAddress,
                fullAddress: addressInfo.fullAddress,
                label: addressInfo.label
            },
            // Additional metadata
            locationSummary: addressInfo.shortAddress,
            businessLogoUrl: business.logoUrl,
            businessLogoSquareUrl: business.logoSquareUrl,
            businessLogoOriginalUrl: business.logoOriginalUrl
        };
        
        console.log('📝 Job payload prepared:');
        console.log(JSON.stringify(jobPayload, null, 2));
        console.log('');
        
        // Create the job
        const createdJob = await makeRequest('POST', API_ENDPOINTS.jobs, jobPayload, employeeToken);
        
        console.log('✅ Job created successfully:');
        console.log(`   Job ID: ${createdJob.id}`);
        console.log(`   Title: ${createdJob.title}`);
        console.log(`   Business: ${createdJob.businessName}`);
        console.log(`   Address: ${createdJob.businessAddress}`);
        console.log(`   Status: ${createdJob.status}`);
        console.log('');
        
        return createdJob;
    } catch (error) {
        console.error('❌ Failed to create job');
        throw error;
    }
}

/**
 * Step 5: Fetch jobs for employees with address information
 */
async function fetchEmployeeJobs(employeeToken) {
    console.log('👔 Fetching employee jobs...');
    
    try {
        const jobs = await makeRequest('GET', API_ENDPOINTS.employeeJobs, null, employeeToken);
        
        console.log(`✅ Found ${jobs.length} employee jobs:`);
        jobs.forEach((job, index) => {
            console.log(`   ${index + 1}. ${job.title}`);
            console.log(`      Business: ${job.businessName || 'Not specified'}`);
            console.log(`      Address: ${job.businessAddress || 'No address'}`);
            console.log(`      Location Summary: ${job.locationSummary || 'Not specified'}`);
            console.log(`      Status: ${job.status}`);
            console.log(`      Applicants: ${job.applicantsCount || 0}`);
            console.log(`      Rate: $${job.hourlyRate}/hr`);
            if (job.location) {
                console.log(`      Coordinates: ${job.location.latitude}, ${job.location.longitude}`);
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
 * Step 6: Fetch jobs for workers with address information
 */
async function fetchWorkerJobs(workerToken) {
    console.log('👷 Fetching worker jobs...');
    
    try {
        const jobs = await makeRequest('GET', API_ENDPOINTS.workerJobs, null, workerToken);
        
        console.log(`✅ Found ${jobs.length} worker jobs:`);
        jobs.forEach((job, index) => {
            console.log(`   ${index + 1}. ${job.title}`);
            console.log(`      Business: ${job.businessName || 'Not specified'}`);
            console.log(`      Address: ${job.businessAddress || 'No address'}`);
            console.log(`      Location Summary: ${job.locationSummary || 'Not specified'}`);
            console.log(`      Status: ${job.status}`);
            console.log(`      Rate: $${job.hourlyRate}/hr`);
            console.log(`      Applied: ${job.hasApplied ? 'Yes' : 'No'}`);
            console.log(`      Distance: ${job.distanceMiles ? job.distanceMiles.toFixed(1) + ' miles' : 'Not calculated'}`);
            console.log(`      Urgency: ${job.urgency}`);
            if (job.location) {
                console.log(`      Coordinates: ${job.location.latitude}, ${job.location.longitude}`);
                console.log(`      Full Address: ${job.location.fullAddress || 'Not specified'}`);
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
 * Step 7: Validate job address data
 */
function validateJobAddressData(job) {
    console.log(`🔍 Validating address data for job: ${job.title}`);
    
    const issues = [];
    
    // Check required fields
    if (!job.businessAddress || job.businessAddress.trim() === '') {
        issues.push('Missing businessAddress field');
    }
    
    if (!job.businessName || job.businessName.trim() === '') {
        issues.push('Missing businessName field');
    }
    
    if (!job.location) {
        issues.push('Missing location object');
    } else {
        if (!job.location.latitude || !job.location.longitude) {
            issues.push('Missing coordinates in location');
        }
        
        if (!job.location.formattedAddress) {
            issues.push('Missing formattedAddress in location');
        }
    }
    
    // Check Flutter compatibility fields
    const requiredFields = ['businessAddress', 'businessName', 'locationSummary'];
    requiredFields.forEach(field => {
        if (!job[field]) {
            issues.push(`Missing Flutter required field: ${field}`);
        }
    });
    
    if (issues.length === 0) {
        console.log('✅ Address validation passed');
        return true;
    } else {
        console.log('❌ Address validation failed:');
        issues.forEach(issue => console.log(`   - ${issue}`));
        return false;
    }
}

/**
 * Step 8: Test the complete workflow
 */
async function testCompleteWorkflow() {
    console.log('🧪 Starting complete job creation and fetching workflow test...\n');
    
    try {
        // Step 1: Fetch available businesses
        const businesses = await fetchAvailableBusinesses(TEST_TOKENS.employee);
        
        if (businesses.length === 0) {
            throw new Error('No businesses available for testing');
        }
        
        // Step 2: Select first business for testing
        const selectedBusiness = businesses[0];
        console.log(`🎯 Selected business: ${selectedBusiness.name} (ID: ${selectedBusiness.id})\n`);
        
        // Step 3: Create job with business address
        const customAddress = null; // Set to custom address string if needed
        const createdJob = await createJobWithBusinessAddress(
            selectedBusiness.id,
            TEST_JOB_DATA,
            customAddress,
            TEST_TOKENS.employee
        );
        
        // Step 4: Validate the created job's address data
        const isValid = validateJobAddressData(createdJob);
        if (!isValid) {
            console.warn('⚠️ Created job has address validation issues\n');
        }
        
        // Step 5: Test fetching jobs for employees
        await fetchEmployeeJobs(TEST_TOKENS.employee);
        
        // Step 6: Test fetching jobs for workers
        await fetchWorkerJobs(TEST_TOKENS.worker);
        
        console.log('🎉 Complete workflow test finished successfully!');
        
        return {
            success: true,
            createdJobId: createdJob.id,
            businessUsed: selectedBusiness,
            addressValidation: isValid
        };
        
    } catch (error) {
        console.error('💥 Workflow test failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Step 9: Test specific job creation scenarios
 */
async function testJobCreationScenarios() {
    console.log('🧪 Testing various job creation scenarios...\n');
    
    const scenarios = [
        {
            name: 'Standard Job Creation',
            data: { ...TEST_JOB_DATA, title: 'Standard Cashier Position' },
            customAddress: null
        },
        {
            name: 'Job with Custom Address',
            data: { ...TEST_JOB_DATA, title: 'Remote Site Worker' },
            customAddress: '123 Custom Street, Remote City, RC 12345'
        },
        {
            name: 'Urgent Job',
            data: { 
                ...TEST_JOB_DATA, 
                title: 'Urgent Kitchen Help',
                urgency: 'high',
                hourlyRate: 22.00
            },
            customAddress: null
        }
    ];
    
    try {
        const businesses = await fetchAvailableBusinesses(TEST_TOKENS.employee);
        if (businesses.length === 0) {
            throw new Error('No businesses available for testing scenarios');
        }
        
        const results = [];
        
        for (const scenario of scenarios) {
            console.log(`📋 Testing scenario: ${scenario.name}`);
            
            try {
                const job = await createJobWithBusinessAddress(
                    businesses[0].id,
                    scenario.data,
                    scenario.customAddress,
                    TEST_TOKENS.employee
                );
                
                const isValid = validateJobAddressData(job);
                
                results.push({
                    scenario: scenario.name,
                    success: true,
                    jobId: job.id,
                    addressValid: isValid
                });
                
                console.log(`✅ ${scenario.name} completed successfully\n`);
                
            } catch (error) {
                console.error(`❌ ${scenario.name} failed:`, error.message);
                results.push({
                    scenario: scenario.name,
                    success: false,
                    error: error.message
                });
            }
        }
        
        console.log('📊 Scenario Test Results:');
        results.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`   ${status} ${result.scenario}: ${result.success ? 'PASSED' : 'FAILED'}`);
            if (result.success) {
                console.log(`      Job ID: ${result.jobId}, Address Valid: ${result.addressValid}`);
            } else {
                console.log(`      Error: ${result.error}`);
            }
        });
        
        return results;
        
    } catch (error) {
        console.error('💥 Scenario testing failed:', error.message);
        return [];
    }
}

/**
 * Main execution function
 */
async function main() {
    console.log('🚀 Job Creation and Fetching System Test\n');
    console.log('=' * 50);
    console.log('This test demonstrates the complete workflow for:');
    console.log('1. Employee selects business ID');
    console.log('2. System fetches business address');
    console.log('3. Job is created with integrated address');
    console.log('4. Jobs are fetched by employees and workers');
    console.log('5. Address data validation');
    console.log('=' * 50);
    console.log('');
    
    // Run the complete workflow test
    const workflowResult = await testCompleteWorkflow();
    
    console.log('\n' + '=' * 50);
    console.log('Testing different job creation scenarios...');
    console.log('=' * 50);
    
    // Run scenario tests
    const scenarioResults = await testJobCreationScenarios();
    
    console.log('\n' + '=' * 50);
    console.log('🏁 TEST SUMMARY');
    console.log('=' * 50);
    console.log(`Main Workflow: ${workflowResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    if (workflowResult.success) {
        console.log(`   Created Job ID: ${workflowResult.createdJobId}`);
        console.log(`   Business Used: ${workflowResult.businessUsed.name}`);
        console.log(`   Address Validation: ${workflowResult.addressValidation ? '✅ PASSED' : '⚠️ WARNING'}`);
    }
    
    const passedScenarios = scenarioResults.filter(r => r.success).length;
    console.log(`Scenarios: ${passedScenarios}/${scenarioResults.length} passed`);
    
    if (workflowResult.success && passedScenarios === scenarioResults.length) {
        console.log('\n🎉 All tests passed! The job creation and address integration system is working correctly.');
    } else {
        console.log('\n⚠️ Some tests failed. Please check the error messages above and verify your API implementation.');
    }
}

// Export functions for use in other files
module.exports = {
    fetchAvailableBusinesses,
    getBusinessDetails,
    formatJobAddress,
    createJobWithBusinessAddress,
    fetchEmployeeJobs,
    fetchWorkerJobs,
    validateJobAddressData,
    testCompleteWorkflow,
    testJobCreationScenarios,
    makeRequest
};

// Run the tests if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}