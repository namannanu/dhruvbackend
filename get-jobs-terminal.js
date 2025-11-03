/**
 * Terminal Job Fetcher
 * Quick script to get worker and employee jobs in terminal
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

// Working tokens from our previous test
const TOKENS = {
    EMPLOYER: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDM1NGNlZGZkN2VkMDZlNWY1OGQ4MSIsImlhdCI6MTc2MjE4MTk4OCwiZXhwIjoxNzYyNzg2Nzg4fQ.YwxId3Rv-tzwo6arFELRDj7ry6JVGiNZtkCQbiAHWZU',
    WORKER: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDM2YTBkYjFhN2NmYWIzYzRjY2JiZCIsImlhdCI6MTc2MjE4MTk4OSwiZXhwIjoxNzYyNzg2Nzg5fQ.J9VR3I1WEj4ZRSSORcJdrbdw5_eiQ9QMwnb0zflcEN4'
};

async function fetchJobs(userType, token) {
    console.log(`\n🔍 === FETCHING ${userType.toUpperCase()} JOBS ===`);
    
    try {
        const response = await axios.get(`${API_BASE_URL}/api/jobs`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const jobs = response.data.data || response.data;
        
        console.log(`📊 Found ${jobs.length} jobs for ${userType}:\n`);
        
        jobs.forEach((job, index) => {
            console.log(`${index + 1}. 📝 ${job.title}`);
            console.log(`   💼 ID: ${job._id}`);
            console.log(`   🏢 Business: ${job.businessName || job.business?.name || 'N/A'}`);
            console.log(`   💰 Rate: $${job.hourlyRate}/hour`);
            console.log(`   📍 Location: ${job.businessAddress || job.location?.formattedAddress || 'N/A'}`);
            console.log(`   📊 Status: ${job.status}`);
            console.log(`   👥 Applicants: ${job.applicantCount || 0}`);
            
            // Detailed job parameters
            console.log(`\n   📋 === DETAILED JOB PARAMETERS ===`);
            console.log(`   📝 Description: ${job.description || 'N/A'}`);
            console.log(`   🕒 Schedule Start: ${job.scheduleStart || 'N/A'}`);
            console.log(`   🕕 Schedule End: ${job.scheduleEnd || 'N/A'}`);
            console.log(`   🔄 Recurrence: ${job.recurrence || 'N/A'}`);
            console.log(`   📅 Work Days: ${job.workDays ? job.workDays.join(', ') : 'N/A'}`);
            console.log(`   ⚡ Urgency: ${job.urgency || 'N/A'}`);
            console.log(`   🏷️  Tags: ${job.tags ? job.tags.join(', ') : 'N/A'}`);
            console.log(`   ✅ Verification Required: ${job.verificationRequired ? 'Yes' : 'No'}`);
            console.log(`   ⏰ Overtime Available: ${job.hasOvertime ? 'Yes' : 'No'}`);
            if (job.hasOvertime && job.overtimeRate) {
                console.log(`   💰 Overtime Rate: $${job.overtimeRate}/hour`);
            }
            console.log(`   🎖️  Premium Required: ${job.premiumRequired ? 'Yes' : 'No'}`);
            console.log(`   📅 Created: ${job.createdAt || 'N/A'}`);
            console.log(`   🔄 Updated: ${job.updatedAt || 'N/A'}`);
            
            // Business details
            console.log(`\n   🏢 === BUSINESS DETAILS ===`);
            console.log(`   🆔 Business ID: ${job.businessId || job.business?._id || 'N/A'}`);
            console.log(`   🏢 Business Name: ${job.businessName || job.business?.name || 'N/A'}`);
            console.log(`   📍 Business Address: ${job.businessAddress || 'N/A'}`);
            
            // Location details
            if (job.location) {
                console.log(`\n   🗺️  === LOCATION DETAILS ===`);
                console.log(`   📍 Formatted Address: ${job.location.formattedAddress || 'N/A'}`);
                console.log(`   📍 Short Address: ${job.location.shortAddress || 'N/A'}`);
                console.log(`   � Full Address: ${job.location.fullAddress || 'N/A'}`);
                console.log(`   🏙️  City: ${job.location.city || 'N/A'}`);
                console.log(`   �🗺️  State: ${job.location.state || 'N/A'}`);
                console.log(`   📮 Postal Code: ${job.location.postalCode || 'N/A'}`);
                console.log(`   🌍 Country: ${job.location.country || 'N/A'}`);
                
                if (job.location.coordinates) {
                    console.log(`   🗺️  Coordinates: ${job.location.coordinates.latitude}, ${job.location.coordinates.longitude}`);
                }
                
                if (job.location.components) {
                    console.log(`   🔧 Address Components: ${JSON.stringify(job.location.components, null, 2)}`);
                }
            }
            
            // Worker-specific data
            if (userType === 'WORKER') {
                console.log(`\n   👷 === WORKER VIEW DATA ===`);
                console.log(`   ✋ Applied: ${job.hasApplied ? 'Yes' : 'No'}`);
                console.log(`   📏 Distance: ${job.distance || 'Not calculated'}`);
                console.log(`   📊 Match Score: ${job.matchScore || 'Not calculated'}`);
                if (job.applicationId) {
                    console.log(`   📋 Application ID: ${job.applicationId}`);
                }
            }
            
            // Raw job object for debugging
            console.log(`\n   🔧 === RAW JOB OBJECT ===`);
            console.log(JSON.stringify(job, null, 2));
            
            console.log('\n' + '='.repeat(80) + '\n');
        });
        
        return jobs;
        
    } catch (error) {
        console.error(`❌ Error fetching ${userType} jobs:`);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Message: ${error.response.data?.message || 'Unknown error'}`);
        } else {
            console.error(`   Error: ${error.message}`);
        }
        return [];
    }
}

async function getJobsInTerminal() {
    console.log('🚀 === JOB FETCHER FOR TERMINAL ===');
    console.log('Getting jobs for both user types...\n');
    
    // Fetch employer/employee jobs
    const employerJobs = await fetchJobs('EMPLOYER', TOKENS.EMPLOYER);
    
    // Fetch worker jobs
    const workerJobs = await fetchJobs('WORKER', TOKENS.WORKER);
    
    // Summary
    console.log('\n📋 === SUMMARY ===');
    console.log(`👔 Employer Jobs: ${employerJobs.length}`);
    console.log(`👷 Worker Jobs: ${workerJobs.length}`);
    
    if (employerJobs.length > 0) {
        console.log('\n🎯 Latest Job Created:');
        const latest = employerJobs[0];
        console.log(`   📝 ${latest.title}`);
        console.log(`   🆔 ${latest._id}`);
        console.log(`   🏢 ${latest.businessName}`);
        console.log(`   📍 ${latest.businessAddress}`);
    }
    
    return { employerJobs, workerJobs };
}

// Command line usage
if (require.main === module) {
    getJobsInTerminal()
        .then(() => {
            console.log('\n✨ Job fetching completed!');
        })
        .catch(error => {
            console.error('\n💥 Error:', error.message);
        });
}

module.exports = { getJobsInTerminal, fetchJobs };