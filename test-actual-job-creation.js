const mongoose = require('mongoose');
const Job = require('./src/modules/jobs/job.model');
const Business = require('./src/modules/businesses/business.model');
const User = require('./src/modules/users/user.model');

async function testActualJobCreation() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/talent', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find existing user and business
    const user = await User.findOne({ userType: 'employer' });
    const business = await Business.findOne({ owner: user._id });

    if (!user || !business) {
      console.log('❌ No suitable user/business found');
      return;
    }

    console.log('👤 Found employer:', user.firstName, user.lastName);
    console.log('🏢 Found business:', business.name);
    console.log('📍 Business location:', JSON.stringify(business.location, null, 2));

    // Test the deriveBusinessAddress function directly from the controller
    const { deriveBusinessAddress } = require('./src/modules/jobs/job.controller');
    
    console.log('\n🧪 Testing deriveBusinessAddress function directly:');
    
    // Test Case 1: With employer-provided formattedAddress
    console.log('\n📋 Test Case 1: With employer formattedAddress');
    const testResult1 = deriveBusinessAddress({
      providedAddress: 'Mahaveer Nagar III Cir',
      location: business.location
    });
    console.log('🎯 Result 1:', testResult1);

    // Test Case 2: Without employer formattedAddress  
    console.log('\n📋 Test Case 2: Without employer formattedAddress');
    const testResult2 = deriveBusinessAddress({
      providedAddress: undefined,
      location: business.location
    });
    console.log('🎯 Result 2:', testResult2);

    // Test Case 3: Create actual job with custom address
    console.log('\n📋 Test Case 3: Create actual job with formattedAddress');
    
    const jobData = {
      title: 'Security Guard - Full Address Test',
      description: 'Testing full address concatenation',
      businessId: business._id,
      employer: user._id,
      category: 'Security',
      salary: 25000,
      salaryType: 'monthly',
      requirements: ['Basic security training'],
      workSchedule: {
        type: 'full-time',
        hoursPerWeek: 40
      },
      isPublished: true,
      status: 'active'
    };

    // Create job WITHOUT formattedAddress first
    console.log('\n🚀 Creating job WITHOUT employer formattedAddress...');
    const job1 = new Job(jobData);
    
    // Manually derive address (simulating controller logic)
    const businessAddress1 = deriveBusinessAddress({
      providedAddress: undefined, // No employer address
      location: business.location
    });
    job1.businessAddress = businessAddress1;
    
    const savedJob1 = await job1.save();
    console.log('✅ Job 1 created:');
    console.log('   ID:', savedJob1._id);
    console.log('   Title:', savedJob1.title);
    console.log('   Business Address:', savedJob1.businessAddress);

    // Create job WITH formattedAddress
    console.log('\n🚀 Creating job WITH employer formattedAddress...');
    const jobDataWithAddress = {
      ...jobData,
      title: 'Security Guard - With Custom Address'
    };
    
    const job2 = new Job(jobDataWithAddress);
    
    // Manually derive address with employer-provided formattedAddress
    const businessAddress2 = deriveBusinessAddress({
      providedAddress: 'Mahaveer Nagar III Cir', // Employer-provided address
      location: business.location
    });
    job2.businessAddress = businessAddress2;
    
    const savedJob2 = await job2.save();
    console.log('✅ Job 2 created:');
    console.log('   ID:', savedJob2._id);
    console.log('   Title:', savedJob2.title);
    console.log('   Business Address:', savedJob2.businessAddress);

    console.log('\n🔍 Comparison:');
    console.log('❌ Without employer address:', businessAddress1);
    console.log('✅ With employer address:', businessAddress2);
    console.log('\n🎯 Expected with employer address:');
    console.log('   "Mahaveer Nagar III Cir, 1 a23 Mahaveer Nagar III Circle, Kota, Rajasthan, 324005, India"');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('Cannot find module')) {
      console.log('\n💡 Note: Cannot import deriveBusinessAddress function directly.');
      console.log('   This means we need to test via API call or check the controller implementation.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

testActualJobCreation();