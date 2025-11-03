const mongoose = require('mongoose');
const Job = require('./src/modules/jobs/job.model');
const Business = require('./src/modules/businesses/business.model');
const User = require('./src/modules/users/user.model');

async function createJobTest() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/talent', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find an existing user and business
    const user = await User.findOne({ userType: 'employer' });
    const business = await Business.findOne({ owner: user._id });

    if (!user || !business) {
      console.log('❌ No suitable user/business found');
      return;
    }

    console.log('👤 Using employer:', user.firstName, user.lastName);
    console.log('🏢 Using business:', business.name);

    // Create a basic test job
    const jobData = {
      title: 'Security Guard - Test Job',
      description: 'Test job posting for backend validation',
      businessId: business._id,
      employer: user._id,
      category: 'Security',
      salary: 25000,
      salaryType: 'monthly',
      requirements: ['Basic security training'],
      benefits: ['Health insurance'],
      workSchedule: {
        type: 'full-time',
        hoursPerWeek: 40
      },
      isPublished: true,
      status: 'active'
    };

    console.log('🚀 Creating test job...');
    console.log('📍 Business Location:', JSON.stringify(business.location, null, 2));

    // Make API call to create job (simulating the controller logic)
    const response = await fetch('http://localhost:3000/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real scenario, you'd need proper auth token
      },
      body: JSON.stringify(jobData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Job created via API!');
      console.log('📋 Job ID:', result.data.job._id);
      console.log('🏢 Business Address:', result.data.job.businessAddress);
    } else {
      console.log('❌ API call failed, creating directly...');
      
      // Direct creation for testing
      const newJob = new Job({
        ...jobData
      });

      const savedJob = await newJob.save();
      console.log('✅ Job created directly!');
      console.log('📋 Job ID:', savedJob._id);
      console.log('🏢 Business Address:', savedJob.businessAddress);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

createJobTest();