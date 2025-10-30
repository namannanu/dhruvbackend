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
const AttendanceRecord = require('./src/modules/attendance/attendance.model');
const { buildAttendanceJobLocation } = require('./src/shared/utils/location');

async function debugAttendanceLocation() {
  try {
    console.log('🔍 Debugging attendance location issue...');
    
    // Find the business
    const business = await Business.findOne({
      'location.allowedRadius': { $exists: true }
    });
    
    if (!business) {
      console.log('❌ No business found');
      return;
    }
    
    console.log(`\n📍 Business: ${business.name}`);
    console.log(`   Business location object:`, JSON.stringify(business.location, null, 2));
    console.log(`   Business allowedRadius: ${business.location.allowedRadius} (type: ${typeof business.location.allowedRadius})`);
    
    // Test buildAttendanceJobLocation
    const jobLocationData = {
      latitude: business.location.latitude,
      longitude: business.location.longitude,
      formattedAddress: business.location.formattedAddress,
      label: business.location.name || business.name,
      allowedRadius: business.location.allowedRadius,
    };
    
    console.log(`\n🧪 Input to buildAttendanceJobLocation:`, JSON.stringify(jobLocationData, null, 2));
    
    const jobLocation = buildAttendanceJobLocation(jobLocationData);
    console.log(`\n📋 Result from buildAttendanceJobLocation:`, JSON.stringify(jobLocation, null, 2));
    console.log(`   Final allowedRadius: ${jobLocation?.allowedRadius} (type: ${typeof jobLocation?.allowedRadius})`);
    
    // Find an attendance record to test
    const attendanceRecord = await AttendanceRecord.findOne({});
    if (attendanceRecord) {
      console.log(`\n🎯 Testing with attendance record: ${attendanceRecord._id}`);
      console.log(`   Current jobLocation:`, JSON.stringify(attendanceRecord.jobLocation, null, 2));
      
      // Update the attendance record with correct job location
      attendanceRecord.jobLocation = jobLocation;
      await attendanceRecord.save();
      
      console.log(`   ✅ Updated attendance record with new jobLocation`);
      
      // Test location validation
      const testWorkerLocation = {
        latitude: 25.136658660331353,  // From the error log
        longitude: 75.83788302695136   // From the error log
      };
      
      const validation = attendanceRecord.isLocationValid(
        testWorkerLocation.latitude,
        testWorkerLocation.longitude
      );
      
      console.log(`\n🧪 Location validation test:`);
      console.log(`   Worker location: ${testWorkerLocation.latitude}, ${testWorkerLocation.longitude}`);
      console.log(`   Business location: ${business.location.latitude}, ${business.location.longitude}`);
      console.log(`   Validation result:`, validation);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugAttendanceLocation();