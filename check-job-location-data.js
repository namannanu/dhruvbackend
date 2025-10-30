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

async function checkJobLocationData() {
  try {
    console.log('🔍 Checking job location data vs business location data...');
    
    // Find the business with allowedRadius
    const business = await Business.findOne({
      'location.allowedRadius': { $exists: true }
    });
    
    if (!business) {
      console.log('❌ No business found with allowedRadius');
      return;
    }
    
    console.log(`\n📍 Business: ${business.name}`);
    console.log(`   Business allowedRadius: ${business.location?.allowedRadius}`);
    console.log(`   Business coordinates: ${business.location?.latitude}, ${business.location?.longitude}`);
    
    // Find jobs for this business
    const jobs = await Job.find({ businessId: business._id }).limit(3);
    
    console.log(`\n📋 Found ${jobs.length} jobs for this business:`);
    jobs.forEach((job, index) => {
      console.log(`\n${index + 1}. Job: ${job.title || 'Unnamed Job'}`);
      console.log(`   Job ID: ${job._id}`);
      console.log(`   Job allowedRadius: ${job.location?.allowedRadius}`);
      console.log(`   Job coordinates: ${job.location?.latitude}, ${job.location?.longitude}`);
      console.log(`   Job address: ${job.location?.formattedAddress || job.location?.address}`);
    });
    
    // Check if job allowedRadius matches business allowedRadius
    const mismatchedJobs = jobs.filter(job => 
      job.location?.allowedRadius !== business.location?.allowedRadius
    );
    
    if (mismatchedJobs.length > 0) {
      console.log(`\n⚠️  Found ${mismatchedJobs.length} jobs with mismatched allowedRadius:`);
      mismatchedJobs.forEach(job => {
        console.log(`   Job "${job.title}": ${job.location?.allowedRadius}m (should be ${business.location?.allowedRadius}m)`);
      });
      console.log('\n💡 Solution: Jobs need to be updated with current business location data');
    } else {
      console.log('\n✅ All jobs have matching allowedRadius with business');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkJobLocationData();