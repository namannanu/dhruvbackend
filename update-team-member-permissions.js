// Script to update team member permissions to use role-based permissions
const mongoose = require('mongoose');
const TeamMember = require('./src/modules/businesses/teamMember.model');

async function updateTeamMemberPermissions() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'your-mongodb-connection-string';
    
    console.log('🔄 Updating team member permissions...');
    
    // Find the team member for dc@gmail.com
    const teamMember = await TeamMember.findOne({
      email: 'dc@gmail.com'
    });
    
    if (!teamMember) {
      console.log('❌ Team member dc@gmail.com not found');
      return;
    }
    
    console.log(`📋 Found team member: ${teamMember.name} with role: ${teamMember.role}`);
    console.log(`📋 Current permissions: ${teamMember.permissions}`);
    
    // Update to remove specific permissions so role-based permissions take effect
    teamMember.permissions = [];
    await teamMember.save();
    
    console.log('✅ Updated team member to use role-based permissions');
    console.log(`📋 Role: ${teamMember.role} (admin should get all permissions)`);
    
  } catch (error) {
    console.error('❌ Error updating team member permissions:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

// Run only if this file is executed directly
if (require.main === module) {
  updateTeamMemberPermissions();
}

module.exports = { updateTeamMemberPermissions };