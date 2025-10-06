const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

async function findUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully');

    const User = require('./src/modules/users/user.model');
    const TeamAccess = require('./src/modules/team/teamAccess.model');
    
    // Find user by ID
    const user = await User.findById('68e2aeba7df47ac55d65a0af');
    console.log('User found:', !!user);
    if (user) {
      console.log('User email:', user.email);
      console.log('User userType:', user.userType);
    }

    // Find all TeamAccess records
    const teamAccessRecords = await TeamAccess.find({});
    console.log('Total TeamAccess records:', teamAccessRecords.length);
    
    teamAccessRecords.forEach((record, index) => {
      console.log(`Record ${index + 1}:`, {
        userEmail: record.userEmail,
        employeeId: record.employeeId,
        status: record.status,
        accessScope: record.accessScope,
        hasViewJobs: record.permissions?.canViewJobs
      });
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

findUser();