/*
  check-job-local.js
  - Connects to MongoDB using provided URI
  - Reads recent jobs and prints job.location, business.location, businessAddress
  - Read-only; does not modify data

  Usage:
    node check-job-local.js

  The script prefers MONGODB_URI env var; otherwise uses the URI supplied inline.
*/

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dd:dd@cluster0.qs4syvv.mongodb.net/?appName=Cluster0';

async function main() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Require models from project (these files should register the schemas)
    // Using relative paths to the project's model files
    const Job = require('./src/modules/jobs/job.model');
    const Business = require('./src/modules/businesses/business.model');

    // Query recent jobs (limit 20) and populate business
    const jobs = await Job.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({ path: 'business', select: 'name businessName location address logoUrl' })
      .lean();

    if (!jobs || jobs.length === 0) {
      console.log('⚠️  No jobs found in DB');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n📦 Found ${jobs.length} jobs (most recent first). Showing details for each:`);

    jobs.forEach((job, idx) => {
      console.log('\n--- Job ' + (idx + 1) + ' ---');
      console.log('Job ID:', job._id?.toString());
      console.log('Title:', job.title || '(no title)');

      console.log('job.location:', job.location ? JSON.stringify(job.location, null, 2) : 'NULL');

      const b = job.business;
      if (b) {
        console.log('business._id:', b._id?.toString());
        console.log('business.name:', b.name || b.businessName || '(no name)');
        console.log('business.address:', b.address ? JSON.stringify(b.address, null, 2) : 'NULL');
        console.log('business.location:', b.location ? JSON.stringify(b.location, null, 2) : 'NULL');
      } else {
        console.log('business: NULL or not populated');
      }

      console.log('job.businessAddress:', job.businessAddress || 'NULL');
    });

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  } catch (err) {
    console.error('❌ Error during DB check:', err && err.message ? err.message : err);
    try { await mongoose.disconnect(); } catch(e){}
    process.exit(1);
  }
}

main();
