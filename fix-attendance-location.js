const mongoose = require('mongoose');
require('dotenv').config();

async function fixAttendanceLocation() {
  try {
    // Connect to MongoDB using the correct environment variable
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/talent');
    console.log('✅ Connected to MongoDB');
    
    // Define a basic schema for attendance records
    const AttendanceRecord = mongoose.model('AttendanceRecord', new mongoose.Schema({}, {strict: false}));
    
    // Update the specific attendance record with GPS location
    const result = await AttendanceRecord.updateOne(
      { _id: '69036c23dca6ccde34ad8a26' },
      { 
        $set: { 
          jobLocation: {
            latitude: 25.1366994,
            longitude: 75.8381062,
            allowedRadius: 200.0,
            name: 'Test Work Location'
          }
        }
      }
    );
    
    console.log('📍 Update result:', result);
    
    if (result.matchedCount > 0) {
      console.log('✅ Successfully added GPS location to attendance record');
      console.log('📱 You can now try clocking in again from the app');
    } else {
      console.log('❌ Attendance record not found with that ID');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixAttendanceLocation();