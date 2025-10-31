#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./src/modules/users/user.model');
const jwt = require('jsonwebtoken');

async function testWorkerApplicationsAPI() {
  try {
    // Connect to MongoDB to get a worker
    const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URI || 'mongodb://localhost:27017/talent';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find a worker user
    const worker = await User.findOne({ userType: 'worker' });
    if (!worker) {
      console.log('❌ No worker found in database');
      return;
    }

    console.log(`🔍 Testing API for worker: ${worker.firstName} ${worker.lastName} (${worker.email})`);

    // Generate JWT token for this worker
    const token = jwt.sign(
      { id: worker._id },
      process.env.JWT_SECRET || 'super-secret-key-change-me',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log('🔐 Generated JWT token for authentication');

    // Test the API endpoint
    const baseURL = 'http://localhost:3000/api/v1';
    const endpoint = '/workers/me/applications';
    const url = `${baseURL}${endpoint}`;

    console.log(`📡 Testing API endpoint: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ API Response Status:', response.status);
    console.log('📋 Response Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    if (error.response) {
      console.log('❌ API Error Status:', error.response.status);
      console.log('❌ API Error Data:', error.response.data);
    } else if (error.request) {
      console.log('❌ Network Error: No response received');
      console.log('❌ Error details:', error.message);
    } else {
      console.log('❌ Error:', error.message);
    }
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

testWorkerApplicationsAPI();