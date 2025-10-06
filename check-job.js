const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

async function checkJob() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const Job = require('./src/modules/jobs/job.model');
    
    const jobId = '670205b44e069da6e0a4ba18';
    const job = await Job.findById(jobId);
    
    console.log('Job exists:', !!job);
    if (job) {
      console.log('Job business field:', job.business);
      console.log('Job business toString():', job.business?.toString());
      console.log('Full job object:');
      console.log(JSON.stringify(job, null, 2));
    } else {
      console.log('Job not found with ID:', jobId);
      
      // Let's see what jobs exist
      const allJobs = await Job.find({}).limit(5);
      console.log('Available jobs (first 5):');
      allJobs.forEach(job => {
        console.log(`- ${job._id}: business=${job.business}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkJob();