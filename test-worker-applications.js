#!/usr/bin/env node

const axios = require('axios');

async function testWorkerApplicationsAPI() {
  const baseURL = 'http://localhost:3000/api';
  
  console.log('Testing Worker Applications API...\n');
  
  try {
    // Test 1: List My Applications endpoint (without auth - should fail)
    console.log('1. Testing GET /applications/me (without auth)');
    try {
      const response = await axios.get(`${baseURL}/applications/me`);
      console.log('❌ Should have failed without auth token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly returns 401 Unauthorized without auth token');
      } else {
        console.log(`❓ Unexpected error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }
    
    // Test 2: Check if server is running
    console.log('\n2. Testing server health');
    try {
      const response = await axios.get(`http://localhost:3000/health`);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server is not running or not accessible');
      console.log('Please start the server with: npm start');
      return;
    }
    
    // Test 3: Test the applications route structure
    console.log('\n3. Testing route availability');
    try {
      const response = await axios.get(`${baseURL}/applications/me`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Applications route exists and requires authentication');
      } else if (error.response?.status === 404) {
        console.log('❌ Applications route not found - check route mounting');
      } else {
        console.log(`❓ Route test result: ${error.response?.status} - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
testWorkerApplicationsAPI();