const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

async function checkUserAndTeamAccess() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const User = require('./src/modules/users/user.model');
    const TeamAccess = require('./src/modules/team/teamAccess.model');
    
    // Check the user
    const user = await User.findById('68e2aeba7df47ac55d65a0af');
    console.log('User found:', !!user);
    if (user) {
      console.log('User email:', user.email);
      console.log('User type:', user.userType);
    }

    // Check all TeamAccess records
    const teamAccessRecords = await TeamAccess.find({});
    console.log('\nAll TeamAccess records:');
    teamAccessRecords.forEach((record, index) => {
      console.log(`Record ${index + 1}:`);
      console.log('  User email:', record.userEmail);
      console.log('  Employee ID:', record.employeeId?.toString());
      console.log('  Status:', record.status);
      console.log('  Access scope:', record.accessScope);
      console.log('  Business context:', record.businessContext);
      console.log('  Can view jobs:', record.permissions?.canViewJobs);
      console.log('  ---');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUserAndTeamAccess();