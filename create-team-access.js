const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const TeamAccess = require('./src/modules/team/teamAccess.model');
const User = require('./src/modules/users/user.model');

async function createTeamAccess() {
  try {
    console.log('🔍 Creating TeamAccess records for testing...');

    // Find or create a test manager user
    let managerUser = await User.findOne({ email: 'manager@company.com' });
    if (!managerUser) {
      managerUser = new User({
        firstName: 'Test',
        lastName: 'Manager',
        email: 'manager@company.com',
        password: 'password123',
        userType: 'employer',
        role: 'manager'
      });
      await managerUser.save();
      console.log('✅ Created test manager user');
    }

    // Find or create a test owner user
    let ownerUser = await User.findOne({ email: 'owner@company.com' });
    if (!ownerUser) {
      ownerUser = new User({
        firstName: 'Test',
        lastName: 'Owner',
        email: 'owner@company.com',
        password: 'password123',
        userType: 'employer',
        role: 'owner'
      });
      await ownerUser.save();
      console.log('✅ Created test owner user');
    }

    // Create TeamAccess for manager with manage_operations level
    const existingAccess = await TeamAccess.findOne({ userEmail: 'manager@company.com' });
    if (existingAccess) {
      console.log('📋 Updating existing TeamAccess for manager...');
      existingAccess.accessLevel = 'manage_operations';
      existingAccess.status = 'active';
      await existingAccess.save();
      console.log('✅ Updated TeamAccess for manager');
    } else {
      const teamAccess = new TeamAccess({
        userEmail: 'manager@company.com',
        employeeId: managerUser._id,
        originalUser: ownerUser._id,
        grantedBy: ownerUser._id,
        accessLevel: 'manage_operations',
        reason: 'Full operations manager access for testing',
        status: 'active'
      });

      await teamAccess.save();
      console.log('✅ Created TeamAccess for manager');
    }

    // Create TeamAccess for supervisor with limited_access level
    let supervisorUser = await User.findOne({ email: 'supervisor@company.com' });
    if (!supervisorUser) {
      supervisorUser = new User({
        firstName: 'Test',
        lastName: 'Supervisor',
        email: 'supervisor@company.com',
        password: 'password123',
        userType: 'employer',
        role: 'supervisor'
      });
      await supervisorUser.save();
      console.log('✅ Created test supervisor user');
    }

    const existingSupervisorAccess = await TeamAccess.findOne({ userEmail: 'supervisor@company.com' });
    if (!existingSupervisorAccess) {
      const supervisorAccess = new TeamAccess({
        userEmail: 'supervisor@company.com',
        employeeId: supervisorUser._id,
        originalUser: ownerUser._id,
        grantedBy: ownerUser._id,
        accessLevel: 'limited_access',
        reason: 'Limited operations access for testing',
        status: 'active'
      });

      await supervisorAccess.save();
      console.log('✅ Created TeamAccess for supervisor');
    }

    // Create TeamAccess for assistant with view_only level
    let assistantUser = await User.findOne({ email: 'assistant@company.com' });
    if (!assistantUser) {
      assistantUser = new User({
        firstName: 'Test',
        lastName: 'Assistant',
        email: 'assistant@company.com',
        password: 'password123',
        userType: 'employer',
        role: 'assistant'
      });
      await assistantUser.save();
      console.log('✅ Created test assistant user');
    }

    const existingAssistantAccess = await TeamAccess.findOne({ userEmail: 'assistant@company.com' });
    if (!existingAssistantAccess) {
      const assistantAccess = new TeamAccess({
        userEmail: 'assistant@company.com',
        employeeId: assistantUser._id,
        originalUser: ownerUser._id,
        grantedBy: ownerUser._id,
        accessLevel: 'view_only',
        reason: 'View-only access for testing',
        status: 'active'
      });

      await assistantAccess.save();
      console.log('✅ Created TeamAccess for assistant');
    }

    // Verify permissions
    console.log('\n📋 Verifying created access records:');
    
    const managerAccess = await TeamAccess.findOne({ userEmail: 'manager@company.com' });
    console.log('Manager permissions:');
    console.log('  - canCreateBusiness:', managerAccess.permissions.canCreateBusiness);
    console.log('  - canEditBusiness:', managerAccess.permissions.canEditBusiness);
    console.log('  - canCreateJobs:', managerAccess.permissions.canCreateJobs);
    console.log('  - accessLevel:', managerAccess.accessLevel);

    console.log('\n🎉 TeamAccess records created successfully!');
    console.log('\nNext steps:');
    console.log('1. Generate JWT tokens for these users');
    console.log('2. Use the tokens in your Postman collection');
    console.log('3. Test business creation with manager token');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating TeamAccess:', error);
    process.exit(1);
  }
}

createTeamAccess();