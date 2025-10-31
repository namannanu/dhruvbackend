#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/modules/users/user.model');
const Application = require('./src/modules/applications/application.model');
const Job = require('./src/modules/jobs/job.model');
const Business = require('./src/modules/businesses/business.model');

async function debugWorkerApplications() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URI || 'mongodb://localhost:27017/talent';
    console.log('Connecting to MongoDB:', mongoUri.replace(/\/\/.*:.*@/, '//***:***@')); // Hide credentials
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find a worker user
    const worker = await User.findOne({ userType: 'worker' });
    if (!worker) {
      console.log('❌ No worker found in database');
      return;
    }

    console.log(`🔍 Found worker: ${worker.firstName} ${worker.lastName} (${worker.email})`);
    console.log(`🔍 Worker ID: ${worker._id}`);

    // Find applications for this worker
    const applications = await Application.find({ worker: worker._id })
      .populate({ path: 'job', populate: { path: 'business' } })
      .sort({ createdAt: -1 });

    console.log(`📋 Found ${applications.length} applications for this worker`);

    if (applications.length > 0) {
      applications.forEach((app, index) => {
        console.log(`\n📄 Application ${index + 1}:`);
        console.log(`   Status: ${app.status}`);
        console.log(`   Job Title: ${app.job ? app.job.title : 'Unknown'}`);
        console.log(`   Business: ${app.job && app.job.business ? app.job.business.name : 'Unknown'}`);
        console.log(`   Created: ${app.createdAt}`);
      });
    } else {
      console.log('ℹ️  No applications found for this worker');
    }

    // Check if there are any applications at all in the database
    const totalApplications = await Application.countDocuments();
    console.log(`\n📊 Total applications in database: ${totalApplications}`);

    if (totalApplications > 0) {
      const someApplications = await Application.find().limit(3).populate('worker');
      console.log('\n🔍 Sample applications in database:');
      someApplications.forEach((app, index) => {
        console.log(`   ${index + 1}. Worker: ${app.worker.firstName} ${app.worker.lastName} (${app.worker.userType})`);
        console.log(`      Status: ${app.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

debugWorkerApplications();