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

async function fixJobLocationData() {
  try {
    console.log('🔧 Fixing job location data...');
    
    // Find the business with proper location data
    const business = await Business.findOne({
      'location.allowedRadius': { $exists: true },
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true }
    });
    
    if (!business) {
      console.log('❌ No business found with complete location data');
      return;
    }
    
    console.log(`\n📍 Using business: ${business.name}`);
    console.log(`   Business ID: ${business._id}`);
    console.log(`   Business allowedRadius: ${business.location.allowedRadius}`);
    console.log(`   Business coordinates: ${business.location.latitude}, ${business.location.longitude}`);
    
    // Find jobs with 150m allowedRadius (the problematic ones)
    const jobs = await Job.find({
      'location.allowedRadius': 150
    });
    
    console.log(`\n💼 Found ${jobs.length} jobs with 150m allowedRadius:`);
    
    for (const job of jobs) {
      console.log(`\n🔧 Fixing job: ${job.title} (ID: ${job._id})`);
      console.log(`   Old businessId: ${job.businessId}`);
      console.log(`   Old allowedRadius: ${job.location?.allowedRadius}`);
      console.log(`   Old coordinates: ${job.location?.latitude}, ${job.location?.longitude}`);
      
      // Update job with business data
      job.businessId = business._id;
      
      // Update location with business location data
      if (!job.location) {
        job.location = {};
      }
      
      job.location.allowedRadius = business.location.allowedRadius;
      job.location.latitude = business.location.latitude;
      job.location.longitude = business.location.longitude;
      job.location.formattedAddress = business.location.formattedAddress || business.location.line1;
      job.location.placeId = business.location.placeId;
      
      await job.save();
      
      console.log(`   ✅ Updated businessId: ${job.businessId}`);
      console.log(`   ✅ Updated allowedRadius: ${job.location.allowedRadius}`);
      console.log(`   ✅ Updated coordinates: ${job.location.latitude}, ${job.location.longitude}`);
    }
    
    console.log(`\n✅ Successfully updated ${jobs.length} jobs!`);
    console.log('\n📋 Next steps:');
    console.log('1. Test worker attendance - should now use 1050m radius');
    console.log('2. Worker should be able to clock in from 1050m away');
    console.log('3. Use the business edit form to adjust radius as needed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixJobLocationData();