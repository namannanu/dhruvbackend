// Test script to verify team member API functionality
const fetch = require('node-fetch');

const API_BASE = 'https://dhruvbackend.vercel.app';

async function testTeamMemberAPI() {
  console.log('🔄 Testing Team Member API...');
  
  try {
    // Test health endpoint first
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Note: We can't test authenticated endpoints without a token
    // But we can check if the endpoint exists
    console.log('\n2. Testing team members endpoint (without auth)...');
    const teamResponse = await fetch(`${API_BASE}/api/businesses/test123/team-members`);
    console.log('📋 Response status:', teamResponse.status);
    console.log('📋 Response headers:', Object.fromEntries(teamResponse.headers));
    
    if (teamResponse.status === 401) {
      console.log('✅ Endpoint exists but requires authentication (expected)');
    } else {
      const teamData = await teamResponse.text();
      console.log('📋 Response body:', teamData);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testTeamMemberAPI();