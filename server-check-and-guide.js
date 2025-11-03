/**
 * Simple Server Check and Usage Guide for Job Address Integration
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';

async function checkServerStatus() {
    console.log('🔍 Checking server status...\n');
    
    try {
        const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
        console.log('✅ Server is running and responding');
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, response.data);
        return true;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Server is not running');
            console.log('   Please start your backend server first');
        } else if (error.response) {
            console.log('✅ Server is running but returned an error');
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Message: ${error.response.data?.message || 'Unknown error'}`);
        } else {
            console.log('❌ Connection error:', error.message);
        }
        return false;
    }
}

function showUsageGuide() {
    console.log('\n📚 === JOB CREATION WITH ADDRESS INTEGRATION - USAGE GUIDE ===\n');
    
    console.log('🎯 WHAT WAS IMPLEMENTED:');
    console.log('1. ✅ Complete job controller with business address integration');
    console.log('2. ✅ Business address auto-fetch when creating jobs');
    console.log('3. ✅ Flutter-compatible response format');
    console.log('4. ✅ Job listing for both employees and workers');
    console.log('5. ✅ Address validation and formatting');
    console.log('6. ✅ Free job quota system (changed to 2 as requested)');
    
    console.log('\n📂 FILES CREATED/MODIFIED:');
    console.log('1. 📝 src/modules/jobs/job.controller.js - Complete controller with address integration');
    console.log('2. 🧪 test-job-address-backend-api.js - Backend API testing');
    console.log('3. 🧪 test-job-with-address-integration.js - Comprehensive workflow testing');
    console.log('4. 🧪 test-complete-job-address-workflow.js - Final integration test');
    
    console.log('\n🚀 HOW TO USE:');
    
    console.log('\n1️⃣ START YOUR SERVER:');
    console.log('   npm start');
    console.log('   # or');
    console.log('   node server.js');
    
    console.log('\n2️⃣ CREATE A JOB (Employee Flow):');
    console.log('   POST /api/jobs');
    console.log('   Headers: Authorization: Bearer <your-employee-token>');
    console.log('   Body: {');
    console.log('     "businessId": "673abc123def456...",  // Required');
    console.log('     "title": "Restaurant Server",');
    console.log('     "description": "Looking for experienced server...",');
    console.log('     "hourlyRate": 15.00,');
    console.log('     "urgency": "medium",');
    console.log('     "scheduleStart": "2024-11-05T10:00:00.000Z",');
    console.log('     "scheduleEnd": "2024-11-05T18:00:00.000Z",');
    console.log('     "recurrence": "weekly",');
    console.log('     "workDays": ["Monday", "Tuesday", "Wednesday"],');
    console.log('     "tags": ["restaurant", "server"],');
    console.log('     "verificationRequired": false');
    console.log('   }');
    
    console.log('\n3️⃣ FETCH JOBS (Employee):');
    console.log('   GET /api/jobs');
    console.log('   Headers: Authorization: Bearer <your-employee-token>');
    
    console.log('\n4️⃣ FETCH JOBS (Worker):');
    console.log('   GET /api/jobs');
    console.log('   Headers: Authorization: Bearer <your-worker-token>');
    
    console.log('\n📱 FLUTTER COMPATIBLE RESPONSE:');
    console.log('   {');
    console.log('     "status": "success",');
    console.log('     "data": {');
    console.log('       "id": "673...",');
    console.log('       "title": "Restaurant Server",');
    console.log('       "businessId": "673...",');
    console.log('       "businessName": "Joe\'s Restaurant",        // ← Auto-filled');
    console.log('       "businessAddress": "123 Main St, City, ST", // ← Auto-filled');
    console.log('       "locationSummary": "City, ST",              // ← Auto-filled');
    console.log('       "location": {                               // ← Enhanced location');
    console.log('         "line1": "123 Main Street",');
    console.log('         "city": "City",');
    console.log('         "state": "ST",');
    console.log('         "latitude": 40.7128,');
    console.log('         "longitude": -74.0060,');
    console.log('         "formattedAddress": "123 Main St, City, ST",');
    console.log('         "shortAddress": "City, ST",');
    console.log('         "fullAddress": "123 Main St, City, ST",');
    console.log('         "label": "Joe\'s Restaurant"');
    console.log('       },');
    console.log('       "hourlyRate": 15.00,');
    console.log('       "hasApplied": false,                        // ← For workers');
    console.log('       "distanceMiles": 2.5,                       // ← For workers');
    console.log('       "scheduleStart": "2024-11-05T10:00:00.000Z",');
    console.log('       "scheduleEnd": "2024-11-05T18:00:00.000Z",');
    console.log('       "recurrence": "weekly"');
    console.log('     }');
    console.log('   }');
    
    console.log('\n🔑 KEY FEATURES IMPLEMENTED:');
    console.log('✅ Business address auto-fetch from businessId');
    console.log('✅ No need to manually enter address when creating jobs');
    console.log('✅ Address stored in multiple formats for Flutter compatibility');
    console.log('✅ Distance calculation for workers');
    console.log('✅ Job quota system (free: 2 jobs, then premium required)');
    console.log('✅ Proper error handling and validation');
    console.log('✅ Both employees and workers can fetch jobs');
    console.log('✅ Address data included in all job responses');
    
    console.log('\n🧪 TO TEST WITH AUTHENTICATION:');
    console.log('1. First, create a user and get a JWT token');
    console.log('2. Create at least one business with address');
    console.log('3. Use the token in the test files:');
    console.log('   - Update EMPLOYEE_TOKEN in test files');
    console.log('   - Run: node test-complete-job-address-workflow.js');
    
    console.log('\n📄 SAMPLE TEST COMMANDS:');
    console.log('# Test without auth (will show auth errors but validate structure)');
    console.log('node test-complete-job-address-workflow.js');
    console.log('');
    console.log('# Test backend API endpoints');
    console.log('node test-job-address-backend-api.js');
    console.log('');
    console.log('# Test comprehensive workflow');
    console.log('node test-job-with-address-integration.js');
    
    console.log('\n✨ SUMMARY:');
    console.log('Your job creation system now automatically fetches business addresses');
    console.log('and integrates them into job creation exactly as you requested!');
    console.log('The system is ready for your Flutter app integration.');
}

async function main() {
    console.log('🏥 Job Address Integration - Server Check & Usage Guide\n');
    
    const serverRunning = await checkServerStatus();
    
    if (!serverRunning) {
        console.log('\n💡 TIP: Start your server first, then run the tests with proper authentication tokens.');
    }
    
    showUsageGuide();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { checkServerStatus, showUsageGuide };