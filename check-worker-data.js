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

async function checkWorkerData() {
  try {
    console.log('🔍 Checking worker/employment data...');
    
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
    
    // Find team members for this business
    const teamMembers = await TeamMember.find({ businessId: business._id }).limit(3);
    console.log(`\n👥 Found ${teamMembers.length} team members for this business:`);
    teamMembers.forEach((member, index) => {
      console.log(`${index + 1}. Team Member: ${member.userId} (${member.role})`);
    });
    
    // Find employment records for this business
    const shifts = await Shift.find({ businessId: business._id }).limit(3);
    console.log(`\n� Found ${shifts.length} shifts for this business:`);
    shifts.forEach((shift, index) => {
      console.log(`\n${index + 1}. Shift ID: ${shift._id}`);
      console.log(`   Job ID: ${shift.jobId}`);
      console.log(`   Worker: ${shift.workerId}`);
      console.log(`   Status: ${shift.status}`);
      if (shift.location) {
        console.log(`   Shift allowedRadius: ${shift.location.allowedRadius}`);
        console.log(`   Shift coordinates: ${shift.location.latitude}, ${shift.location.longitude}`);
        console.log(`   Shift address: ${shift.location.formattedAddress || shift.location.address}`);
      } else {
        console.log(`   Shift location: null`);
      }
    });
    
    // Check for mismatched allowedRadius in shift records
    const mismatchedShifts = shifts.filter(shift => 
      shift.location?.allowedRadius && shift.location.allowedRadius !== business.location?.allowedRadius
    );
    
    if (mismatchedShifts.length > 0) {
      console.log(`\n⚠️  Found ${mismatchedShifts.length} shifts with mismatched allowedRadius:`);
      mismatchedShifts.forEach(shift => {
        console.log(`   Shift ${shift._id}: ${shift.location?.allowedRadius}m (should be ${business.location?.allowedRadius}m)`);
      });
      console.log('\n💡 Solution: Shift records need to be updated with current business location data');
    } else if (shifts.length > 0) {
      console.log('\n✅ All shifts have matching allowedRadius with business');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkWorkerData();