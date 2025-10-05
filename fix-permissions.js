const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

const TeamAccess = require('./src/modules/team/teamAccess.model');

async function fixTeamAccessPermissions() {
  try {
    console.log('🔧 Fixing TeamAccess permissions...');

    // Find the TeamAccess record we just created
    const teamAccess = await TeamAccess.findOne({ userEmail: 'b@example.com' });
    
    if (!teamAccess) {
      console.log('❌ No TeamAccess found for b@example.com');
      process.exit(1);
    }

    console.log('📋 Current permissions before fix:');
    console.log('  - canCreateBusiness:', teamAccess.permissions.canCreateBusiness);
    console.log('  - accessLevel:', teamAccess.accessLevel);

    // Manually set the permissions for manage_operations level
    teamAccess.permissions.canCreateJobs = true;
    teamAccess.permissions.canEditJobs = true;
    teamAccess.permissions.canViewJobs = true;
    teamAccess.permissions.canHireWorkers = true;
    teamAccess.permissions.canCreateAttendance = true;
    teamAccess.permissions.canEditAttendance = true;
    teamAccess.permissions.canApproveAttendance = true;
    teamAccess.permissions.canViewAttendance = true;
    teamAccess.permissions.canCreateBusiness = true;
    teamAccess.permissions.canEditBusiness = true;
    teamAccess.permissions.canDeleteBusiness = false;
    teamAccess.permissions.canViewBusiness = true;
    teamAccess.permissions.canManageBusiness = true;
    teamAccess.permissions.canViewApplications = true;
    teamAccess.permissions.canManageApplications = true;

    // Save the changes
    await teamAccess.save();

    console.log('\n✅ Permissions updated successfully!');
    console.log('📋 New permissions:');
    console.log('  - canCreateBusiness:', teamAccess.permissions.canCreateBusiness);
    console.log('  - canEditBusiness:', teamAccess.permissions.canEditBusiness);
    console.log('  - canCreateJobs:', teamAccess.permissions.canCreateJobs);
    console.log('  - canCreateAttendance:', teamAccess.permissions.canCreateAttendance);

    console.log('\n🎉 TeamAccess is now properly configured!');
    console.log('\n📝 For Postman testing:');
    console.log('1. Login with email: b@example.com');
    console.log('2. Copy the JWT token from login response');
    console.log('3. Set it as {{managerToken}} in Postman environment');
    console.log('4. Try creating a business - it should work now!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixTeamAccessPermissions();