const mongoose = require('mongoose');
require('dotenv').config();

async function checkLocationStorage() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/talent');
    console.log('✅ Connected to MongoDB');
    
    // Define schemas for checking
    const Business = mongoose.model('Business', new mongoose.Schema({}, {strict: false}));
    const Job = mongoose.model('Job', new mongoose.Schema({}, {strict: false}));
    const AttendanceRecord = mongoose.model('AttendanceRecord', new mongoose.Schema({}, {strict: false}));
    
    console.log('\n📍 CHECKING LOCATION DATA STORAGE...\n');
    
    // Check businesses with location data
    console.log('🏢 BUSINESSES:');
    const businesses = await Business.find({}).limit(5);
    businesses.forEach((business, index) => {
      console.log(`  ${index + 1}. ${business.name || 'Unnamed'}`);
      
      if (business.location) {
        console.log(`     📍 Location: ${JSON.stringify({
          latitude: business.location.latitude,
          longitude: business.location.longitude,
          formattedAddress: business.location.formattedAddress,
          name: business.location.name,
          placeId: business.location.placeId,
          allowedRadius: business.location.allowedRadius
        }, null, 6)}`);
      } else {
        console.log(`     ❌ No location data`);
      }
      console.log('');
    });
    
    // Check jobs with location data
    console.log('\n💼 JOBS:');
    const jobs = await Job.find({}).limit(5);
    jobs.forEach((job, index) => {
      console.log(`  ${index + 1}. ${job.title || 'Unnamed'}`);
      
      if (job.location) {
        console.log(`     📍 Location: ${JSON.stringify({
          latitude: job.location.latitude,
          longitude: job.location.longitude,
          formattedAddress: job.location.formattedAddress,
          name: job.location.name,
          placeId: job.location.placeId,
          allowedRadius: job.location.allowedRadius
        }, null, 6)}`);
      } else {
        console.log(`     ❌ No location data`);
      }
      console.log('');
    });
    
    // Check attendance records
    console.log('\n⏰ ATTENDANCE RECORDS:');
    const attendanceRecords = await AttendanceRecord.find({}).limit(3);
    attendanceRecords.forEach((record, index) => {
      console.log(`  ${index + 1}. Record ID: ${record._id}`);
      
      if (record.jobLocation) {
        console.log(`     📍 Job Location: ${JSON.stringify({
          latitude: record.jobLocation.latitude,
          longitude: record.jobLocation.longitude,
          formattedAddress: record.jobLocation.formattedAddress,
          name: record.jobLocation.name,
          allowedRadius: record.jobLocation.allowedRadius
        }, null, 6)}`);
      } else {
        console.log(`     ❌ No job location data`);
      }
      console.log('');
    });
    
    // Summary statistics
    const businessesWithLocation = await Business.countDocuments({
      'location.latitude': { $exists: true, $ne: null },
      'location.longitude': { $exists: true, $ne: null }
    });
    
    const jobsWithLocation = await Job.countDocuments({
      'location.latitude': { $exists: true, $ne: null },
      'location.longitude': { $exists: true, $ne: null }
    });
    
    const attendanceWithJobLocation = await AttendanceRecord.countDocuments({
      'jobLocation.latitude': { $exists: true, $ne: null },
      'jobLocation.longitude': { $exists: true, $ne: null }
    });
    
    const totalBusinesses = await Business.countDocuments({});
    const totalJobs = await Job.countDocuments({});
    const totalAttendance = await AttendanceRecord.countDocuments({});
    
    console.log('\n📊 SUMMARY STATISTICS:');
    console.log(`🏢 Businesses with GPS coordinates: ${businessesWithLocation}/${totalBusinesses}`);
    console.log(`💼 Jobs with GPS coordinates: ${jobsWithLocation}/${totalJobs}`);
    console.log(`⏰ Attendance records with job location: ${attendanceWithJobLocation}/${totalAttendance}`);
    
    if (businessesWithLocation === 0 && jobsWithLocation === 0) {
      console.log('\n❌ ISSUE FOUND: No latitude/longitude coordinates are being stored!');
      console.log('📝 This explains why attendance tracking fails - no GPS locations are configured.');
    } else {
      console.log('\n✅ Some location data found, but may need verification.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the check
checkLocationStorage();