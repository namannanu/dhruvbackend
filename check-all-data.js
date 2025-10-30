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
const TeamMember = require('./src/modules/businesses/teamMember.model');
const Job = require('./src/modules/jobs/job.model');
const Shift = require('./src/modules/shifts/shift.model');
const User = require('./src/modules/users/user.model');

async function checkAllData() {
  try {
    console.log('🔍 Checking all data to find the source of 150m allowedRadius...');
    
    // Find user named nanu
    const user = await User.findOne({ name: /nanu/i });
    if (user) {
      console.log(`\n👤 Found user: ${user.name} (ID: ${user._id})`);
      console.log(`   Email: ${user.email}`);
    }
    
    // Check all businesses
    const allBusinesses = await Business.find({});
    console.log(`\n🏢 All businesses (${allBusinesses.length}):`);
    allBusinesses.forEach((business, index) => {
      console.log(`${index + 1}. ${business.name} (ID: ${business._id})`);
      if (business.location) {
        console.log(`   allowedRadius: ${business.location.allowedRadius}`);
        console.log(`   coordinates: ${business.location.latitude}, ${business.location.longitude}`);
      } else {
        console.log(`   location: null`);
      }
    });
    
    // Check all team members
    const allTeamMembers = await TeamMember.find({});
    console.log(`\n👥 All team members (${allTeamMembers.length}):`);
    allTeamMembers.forEach((member, index) => {
      console.log(`${index + 1}. User: ${member.userId}, Business: ${member.businessId}, Role: ${member.role}`);
    });
    
    // Check all jobs
    const allJobs = await Job.find({});
    console.log(`\n💼 All jobs (${allJobs.length}):`);
    allJobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title || 'Unnamed'} (ID: ${job._id})`);
      console.log(`   Business: ${job.businessId}`);
      if (job.location) {
        console.log(`   allowedRadius: ${job.location.allowedRadius}`);
        console.log(`   coordinates: ${job.location.latitude}, ${job.location.longitude}`);
      } else {
        console.log(`   location: null`);
      }
    });
    
    // Check all shifts
    const allShifts = await Shift.find({});
    console.log(`\n📅 All shifts (${allShifts.length}):`);
    allShifts.forEach((shift, index) => {
      console.log(`${index + 1}. Shift ID: ${shift._id}`);
      console.log(`   Business: ${shift.businessId}, Job: ${shift.jobId}`);
      console.log(`   Worker: ${shift.workerId}, Status: ${shift.status}`);
      if (shift.location) {
        console.log(`   allowedRadius: ${shift.location.allowedRadius}`);
        console.log(`   coordinates: ${shift.location.latitude}, ${shift.location.longitude}`);
      } else {
        console.log(`   location: null`);
      }
    });
    
    // Look for any records with allowedRadius = 150
    console.log(`\n🔍 Searching for records with allowedRadius = 150...`);
    
    const businessesWith150 = allBusinesses.filter(b => b.location?.allowedRadius === 150);
    const jobsWith150 = allJobs.filter(j => j.location?.allowedRadius === 150);
    const shiftsWith150 = allShifts.filter(s => s.location?.allowedRadius === 150);
    
    if (businessesWith150.length > 0) {
      console.log(`   Businesses with 150m: ${businessesWith150.map(b => b.name).join(', ')}`);
    }
    if (jobsWith150.length > 0) {
      console.log(`   Jobs with 150m: ${jobsWith150.map(j => j.title || j._id).join(', ')}`);
    }
    if (shiftsWith150.length > 0) {
      console.log(`   Shifts with 150m: ${shiftsWith150.map(s => s._id).join(', ')}`);
    }
    
    if (businessesWith150.length === 0 && jobsWith150.length === 0 && shiftsWith150.length === 0) {
      console.log(`   ❌ No records found with allowedRadius = 150`);
      console.log(`   💡 The 150m value might be a frontend default or cached data`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAllData();