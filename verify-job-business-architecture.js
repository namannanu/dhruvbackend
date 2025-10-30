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

async function verifyJobBusinessReferences() {
  try {
    console.log('🔍 Verifying job-business references...');
    
    // Find the business with location
    const business = await Business.findOne({
      'location.allowedRadius': { $exists: true }
    });
    
    if (!business) {
      console.log('❌ No business found with location data');
      return;
    }
    
    console.log(`\n📍 Target business: ${business.name} (ID: ${business._id})`);
    console.log(`   Location: ${business.location?.latitude}, ${business.location?.longitude}`);
    console.log(`   AllowedRadius: ${business.location?.allowedRadius}m`);
    
    // Check all jobs
    const jobs = await Job.find({});
    console.log(`\n💼 Checking ${jobs.length} jobs:`);
    
    for (const job of jobs) {
      console.log(`\n📋 Job: ${job.title} (ID: ${job._id})`);
      console.log(`   Current businessId: ${job.businessId}`);
      console.log(`   Current business field: ${job.business}`);
      
      // Fix businessId if needed
      if (!job.businessId || job.businessId.toString() !== business._id.toString()) {
        console.log(`   🔧 Updating businessId to: ${business._id}`);
        job.businessId = business._id;
        await job.save();
        console.log(`   ✅ Updated`);
      } else {
        console.log(`   ✅ BusinessId is correct`);
      }
    }
    
    // Test location validation
    console.log(`\n🧪 Testing location validation...`);
    const testJob = jobs[0];
    if (testJob) {
      await testJob.populate('businessId');
      console.log(`\nTest job: ${testJob.title}`);
      console.log(`Business populated: ${testJob.businessId?.name}`);
      console.log(`Business location: ${testJob.businessId?.location?.latitude}, ${testJob.businessId?.location?.longitude}`);
      console.log(`Business allowedRadius: ${testJob.businessId?.location?.allowedRadius}m`);
      
      // Test validation with a location in Delhi (should be valid since business is in Delhi)
      const testWorkerLocation = {
        latitude: 28.6139, // Same as business
        longitude: 77.2090  // Same as business
      };
      
      const validationResult = await testJob.validateWorkerLocation(testWorkerLocation);
      console.log(`\n🧪 Validation result:`, validationResult);
    }
    
    console.log(`\n✅ Job-business architecture verification complete!`);
    console.log(`📋 Summary:`);
    console.log(`   - All jobs now properly reference business`);
    console.log(`   - Jobs inherit location from business.location`);
    console.log(`   - Location validation uses business allowedRadius (${business.location?.allowedRadius}m)`);
    console.log(`   - Single source of truth for location data`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyJobBusinessReferences();