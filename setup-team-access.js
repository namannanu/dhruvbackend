const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

const TeamAccess = require('./src/modules/team/teamAccess.model');
const User = require('./src/modules/users/user.model');

async function createTeamAccessForExistingUsers() {
  try {
    console.log('🔍 Creating TeamAccess records for existing users...');

    // Get all existing users
    const users = await User.find({}).limit(5);
    console.log(`Found ${users.length} existing users`);

    if (users.length === 0) {
      console.log('❌ No users found. Please create users first.');
      process.exit(1);
    }

    // Use the first user as owner/granter, second as manager
    const ownerUser = users[0];
    const managerUser = users[1] || users[0]; // Use same user if only one exists

    console.log('👤 Using users:');
    console.log(`   Owner: ${ownerUser.email}`);
    console.log(`   Manager: ${managerUser.email}`);

    // Create or update TeamAccess for manager
    const existingAccess = await TeamAccess.findOne({ userEmail: managerUser.email });
    
    if (existingAccess) {
      console.log('📋 Updating existing TeamAccess...');
      existingAccess.accessLevel = 'manage_operations';
      existingAccess.status = 'active';
      await existingAccess.save();
      console.log('✅ Updated TeamAccess for', managerUser.email);
    } else {
      console.log('📋 Creating new TeamAccess...');
      const teamAccess = new TeamAccess({
        userEmail: managerUser.email,
        employeeId: managerUser._id,
        originalUser: ownerUser._id,
        grantedBy: ownerUser._id,
        accessLevel: 'manage_operations',
        reason: 'Full operations manager access for testing',
        status: 'active'
      });

      await teamAccess.save();
      console.log('✅ Created TeamAccess for', managerUser.email);
    }

    // Verify the permissions
    const createdAccess = await TeamAccess.findOne({ userEmail: managerUser.email });
    console.log('\n📋 Permissions verification:');
    console.log('  - AccessLevel:', createdAccess.accessLevel);
    console.log('  - canCreateBusiness:', createdAccess.permissions.canCreateBusiness);
    console.log('  - canEditBusiness:', createdAccess.permissions.canEditBusiness);
    console.log('  - canCreateJobs:', createdAccess.permissions.canCreateJobs);
    console.log('  - Status:', createdAccess.status);

    console.log('\n🎉 TeamAccess record created successfully!');
    console.log('\nNext steps:');
    console.log(`1. Login as: ${managerUser.email}`);
    console.log('2. Get the JWT token');
    console.log('3. Use that token as {{managerToken}} in Postman');
    console.log('4. Test business creation');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTeamAccessForExistingUsers();