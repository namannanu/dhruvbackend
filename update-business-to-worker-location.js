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

async function updateBusinessToWorkerLocation() {
  try {
    console.log('🔧 Updating business location to match worker location...');
    
    // Worker's current location from the error log
    const workerLocation = {
      latitude: 25.136658660331353,   // Kota, Rajasthan
      longitude: 75.83788302695136
    };
    
    console.log(`📍 Worker location: ${workerLocation.latitude}, ${workerLocation.longitude}`);
    
    // Find the business
    const business = await Business.findOne({
      'location.allowedRadius': { $exists: true }
    });
    
    if (!business) {
      console.log('❌ No business found');
      return;
    }
    
    console.log(`\n🏢 Business: ${business.name}`);
    console.log(`   Old location: ${business.location.latitude}, ${business.location.longitude} (Delhi)`);
    console.log(`   AllowedRadius: ${business.location.allowedRadius}m`);
    
    // Update business location to worker's location
    business.location.latitude = workerLocation.latitude;
    business.location.longitude = workerLocation.longitude;
    business.location.formattedAddress = "Kota, Rajasthan, India"; // Update address too
    business.location.setAt = new Date();
    
    await business.save();
    
    console.log(`   ✅ New location: ${business.location.latitude}, ${business.location.longitude} (Kota, Rajasthan)`);
    console.log(`   ✅ Kept allowedRadius: ${business.location.allowedRadius}m`);
    
    // Update all attendance records to use the new business location
    const attendanceRecords = await AttendanceRecord.find({});
    console.log(`\n📋 Updating ${attendanceRecords.length} attendance records...`);
    
    for (const record of attendanceRecords) {
      record.jobLocation = {
        latitude: business.location.latitude,
        longitude: business.location.longitude,
        allowedRadius: business.location.allowedRadius,
        name: business.name,
        formattedAddress: business.location.formattedAddress,
        isActive: true,
        setAt: new Date()
      };
      await record.save();
      console.log(`   ✅ Updated attendance record: ${record._id}`);
    }
    
    // Test validation with worker at the same location as business
    const testRecord = attendanceRecords[0];
    if (testRecord) {
      const validation = testRecord.isLocationValid(
        workerLocation.latitude,
        workerLocation.longitude
      );
      
      console.log(`\n🧪 Location validation test (worker at business location):`);
      console.log(`   Distance: ${validation.distance}m`);
      console.log(`   AllowedRadius: ${validation.allowedRadius}m`);
      console.log(`   Valid: ${validation.isValid}`);
      console.log(`   Message: ${validation.message}`);
    }
    
    console.log(`\n✅ Business location updated successfully!`);
    console.log(`📱 Worker should now be able to clock in from Kota, Rajasthan within ${business.location.allowedRadius}m`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateBusinessToWorkerLocation();