const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.join(__dirname, 'src', 'config', 'config.env') });

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is not set');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI);

const Business = require('./src/modules/businesses/business.model');
const Job = require('./src/modules/jobs/job.model');

async function fixJobArchitecture() {
  try {
    console.log('🔧 Fixing job architecture - removing duplicate location data...');
    
    // Find the business to link jobs to
    const business = await Business.findOne({
      'location.allowedRadius': { $exists: true },
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true }
    });
    
    if (!business) {
      console.log('❌ No business found with complete location data');
      return;
    }
    
    console.log(`\n📍 Using business: ${business.name} (ID: ${business._id})`);
    console.log(`   Business location: ${business.location.latitude}, ${business.location.longitude}`);
    console.log(`   Business allowedRadius: ${business.location.allowedRadius}m`);
    
    // Find all jobs
    const jobs = await Job.find({});
    console.log(`\n💼 Found ${jobs.length} jobs to fix:`);
    
    for (const job of jobs) {
      console.log(`\n🔧 Fixing job: ${job.title} (ID: ${job._id})`);
      console.log(`   Current businessId: ${job.businessId || job.business || 'undefined'}`);
      console.log(`   Current location: ${job.location ? 'exists' : 'null'}`);
      
      // Set the business reference
      if (job.business) {
        job.businessId = job.business;
      } else {
        job.businessId = business._id;
        job.business = business._id;
      }
      
      // Remove the location field entirely (jobs should inherit from business)
      if (job.location) {
        console.log(`   🗑️  Removing duplicate location data from job`);
        job.location = undefined;
        job.set('location', undefined);
      }
      
      await job.save();
      console.log(`   ✅ Updated businessId: ${job.businessId}`);
      console.log(`   ✅ Removed job location (will inherit from business)`);
    }
    
    console.log(`\n✅ Successfully fixed ${jobs.length} jobs!`);
    console.log('\n📋 Architecture improvements:');
    console.log('1. ✅ All jobs now have proper businessId references');
    console.log('2. ✅ Removed duplicate location data from jobs');
    console.log('3. ✅ Jobs will inherit location from business (single source of truth)');
    console.log('4. ✅ Radius changes in business will automatically apply to all jobs');
    
    console.log('\n🔧 Next steps:');
    console.log('1. Update job model to remove locationSchema');
    console.log('2. Update attendance validation to get location from business');
    console.log('3. Update frontend to not send location data when creating jobs');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixJobArchitecture();