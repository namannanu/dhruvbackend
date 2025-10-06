const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

async function debugSimple() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully');

    // Import models after connection
    const TeamAccess = require('./src/modules/team/teamAccess.model');
    
    // Find TeamAccess record
    const teamAccess = await TeamAccess.findOne({
      userEmail: 'w@example.com',
      status: 'active'
    });

    console.log('TeamAccess found:', !!teamAccess);
    if (teamAccess) {
      console.log('TeamAccess permissions:', {
        canViewJobs: teamAccess.permissions?.canViewJobs,
        canCreateJobs: teamAccess.permissions?.canCreateJobs,
        canHireWorkers: teamAccess.permissions?.canHireWorkers,
        accessScope: teamAccess.accessScope,
        businessContext: teamAccess.businessContext
      });
    } else {
      console.log('No TeamAccess record found for w@example.com');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('Closing connection...');
    await mongoose.disconnect();
  }
}

debugSimple();