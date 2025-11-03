/**
 * Quick Token Validation Test
 * 
 * This simple script tests if your authentication token is working
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000';

// Test function
async function testToken(token) {
    console.log('🔐 Testing Authentication Token...\n');
    
    if (!token) {
        console.log('❌ No token provided');
        return false;
    }
    
    console.log(`📋 Token: ${token.substring(0, 50)}...`);
    
    const endpoints = [
        { name: 'User Profile', url: '/api/auth/me' },
        { name: 'Businesses', url: '/api/businesses' },
        { name: 'Jobs', url: '/api/jobs' }
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`\n🌐 Testing ${endpoint.name}: GET ${API_BASE_URL}${endpoint.url}`);
            
            const response = await axios.get(`${API_BASE_URL}${endpoint.url}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`✅ ${endpoint.name}: Success (${response.status})`);
            if (endpoint.name === 'User Profile' && response.data) {
                console.log(`   User ID: ${response.data.data?._id || response.data._id || 'Unknown'}`);
                console.log(`   Role: ${response.data.data?.role || response.data.role || 'Unknown'}`);
                console.log(`   Email: ${response.data.data?.email || response.data.email || 'Unknown'}`);
            }
            
        } catch (error) {
            if (error.response) {
                console.log(`❌ ${endpoint.name}: Failed (${error.response.status})`);
                console.log(`   Error: ${error.response.data?.message || 'Unknown error'}`);
            } else {
                console.log(`❌ ${endpoint.name}: Network error`);
                console.log(`   Error: ${error.message}`);
            }
        }
    }
    
    return true;
}

// If running directly
if (require.main === module) {
    // You can paste your token here to test it
    const YOUR_TOKEN = process.argv[2] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDY4YTJhNGMzOTNhY2NhMzcwOWZkMCIsInJvbGUiOiJlbXBsb3llciIsImlhdCI6MTc2MjE4MTIyOSwiZXhwIjoxNzYyNzg2MDI5fQ.A9XJCpPtQqCmQhYe3eeSfXpM8QeJsnieXytJ4qNCwdk';
    
    console.log('🧪 === TOKEN VALIDATION TEST ===');
    console.log('Usage: node test-token-validation.js [your-token-here]');
    console.log('Or edit the YOUR_TOKEN variable in this file\n');
    
    testToken(YOUR_TOKEN)
        .then(() => {
            console.log('\n✨ Token validation completed.');
        })
        .catch(error => {
            console.error('\n💥 Test failed:', error.message);
        });
}

module.exports = { testToken };