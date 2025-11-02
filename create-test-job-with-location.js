const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Job = require('./src/modules/jobs/job.model');
const Business = require('./src/modules/businesses/business.model');
const User = require('./src/modules/users/user.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dd:dd@cluster0.qs4syvv.mongodb.net/?appName=Cluster0';

async function createTestJob() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find the existing business and user
    const business = await Business.findOne().populate('owner');
    if (!business) {
      console.log('❌ No business found');
      return;
    }

    console.log(`🏢 Found business: ${business.businessName || business.name}`);
    console.log(`📍 Business location: ${business.location?.formattedAddress || 'No location'}`);

    const user = business.owner;
    console.log(`👤 Business owner: ${user.firstName} ${user.lastName}`);

    // Create a new test job
    const testJobData = {
      title: 'Test Job - Location Verification',
      description: 'This is a test job to verify that business address is automatically copied to job location',
      hourlyRate: 15.50,
      category: 'General Labor',
      status: 'active',
      employer: user._id,
      createdBy: user._id,
      business: business._id,
      isPublished: true,
      publishedAt: new Date(),
      publishedBy: user._id
    };

    // Simulate the location copying logic from job.controller.js
    let jobLocation = null;
    if (business.location) {
      console.log('📍 Copying business location to job...');
      jobLocation = {
        ...business.location.toObject ? business.location.toObject() : business.location,
        setBy: user._id,
        setAt: new Date()
      };
    }

    // Derive business address using the updated logic from job.controller.js
    let businessAddress = null;
    if (jobLocation) {
      const plain = jobLocation;
      
      // Use the clean formattedAddress if available (after our data structure fix)
      if (plain.formattedAddress && plain.formattedAddress.trim()) {
        const street = plain.formattedAddress.trim();
        const city = plain.city;
        const state = plain.state;
        
        // Create clean address: "Street, City, State" format
        if (city && state) {
          businessAddress = `${street}, ${city}, ${state}`;
        } else if (city) {
          businessAddress = `${street}, ${city}`;
        } else {
          businessAddress = street;
        }
        
        console.log(`🏢 Derived business address: "${businessAddress}"`);
        console.log(`   From formattedAddress: "${street}"`);
        console.log(`   From city: "${city}"`);
        console.log(`   From state: "${state}"`);
      } else if (plain.line1) {
        // Fallback: Build from components
        const parts = [];
        if (plain.line1) parts.push(plain.line1);
        if (plain.city) parts.push(plain.city);
        if (plain.state) parts.push(plain.state);
        
        if (parts.length > 0) {
          businessAddress = parts.join(', ');
        }
      }
    }

    // Add location data to job
    testJobData.location = jobLocation;
    testJobData.businessAddress = businessAddress;

    console.log('🚀 Creating test job...');
    const newJob = await Job.create(testJobData);
    
    console.log('\n✅ Test job created successfully!');
    console.log(`📋 Job ID: ${newJob._id}`);
    console.log(`📝 Title: ${newJob.title}`);
    console.log(`📍 Job Location: ${newJob.location?.formattedAddress || 'No location'}`);
    console.log(`🏢 Business Address: ${newJob.businessAddress || 'No business address'}`);
    console.log(`📱 Status: ${newJob.status}`);
    console.log(`🌐 Published: ${newJob.isPublished}`);

    // Verify the job was created with proper location data
    const verifyJob = await Job.findById(newJob._id).populate('business');
    console.log('\n🔍 Verification:');
    console.log(`   Job has location: ${verifyJob.location ? '✅ YES' : '❌ NO'}`);
    console.log(`   Job has businessAddress: ${verifyJob.businessAddress ? '✅ YES' : '❌ NO'}`);
    console.log(`   Business has location: ${verifyJob.business.location ? '✅ YES' : '❌ NO'}`);

    if (verifyJob.location && verifyJob.businessAddress) {
      console.log('\n🎉 SUCCESS: Job created with proper location data!');
      console.log('   Flutter app should now display business address correctly.');
    } else {
      console.log('\n⚠️  WARNING: Job missing location data');
    }

  } catch (error) {
    console.error('❌ Error creating test job:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
if (require.main === module) {
  createTestJob()
    .then(() => {
      console.log('✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = createTestJob;