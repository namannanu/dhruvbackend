// Test script to create sample team members for testing
const mongoose = require('mongoose');
const TeamMember = require('./src/modules/businesses/teamMember.model');
const Business = require('./src/modules/businesses/business.model');
const User = require('./src/modules/users/user.model');

async function createSampleTeamMembers() {
  try {
    // Connect to MongoDB (you'll need to update the connection string)
    const mongoUri = process.env.MONGODB_URI || 'your-mongodb-connection-string';
    await mongoose.connect(mongoUri);
    
    console.log('🔄 Creating sample team members...');
    
    // Find an existing business and user for testing
    const business = await Business.findOne();
    const user = await User.findOne();
    
    if (!business || !user) {
      console.log('❌ No business or user found for testing');
      return;
    }
    
    // Create sample team members
    const sampleMembers = [
      {
        business: business._id,
        user: user._id,
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'manager',
        permissions: ['view_team_members', 'manage_schedules'],
        isActive: true
      },
      {
        business: business._id,
        user: user._id,
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'supervisor',
        permissions: ['view_team_members'],
        isActive: true
      }
    ];
    
    for (const member of sampleMembers) {
      const existingMember = await TeamMember.findOne({
        business: member.business,
        email: member.email
      });
      
      if (!existingMember) {
        await TeamMember.create(member);
        console.log('✅ Created team member:', member.name);
      } else {
        console.log('⚠️ Team member already exists:', member.name);
      }
    }
    
    console.log('✅ Sample team members created successfully');
    
  } catch (error) {
    console.error('❌ Error creating sample team members:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run only if this file is executed directly
if (require.main === module) {
  createSampleTeamMembers();
}

module.exports = { createSampleTeamMembers };