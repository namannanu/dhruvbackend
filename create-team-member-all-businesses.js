// Script to create team member entries for dc@gmail.com in ALL businesses
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const TeamMember = require('./src/modules/businesses/teamMember.model');
const User = require('./src/modules/users/user.model');
const Business = require('./src/modules/businesses/business.model');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.join(__dirname, 'src', 'config', 'config.env') });

async function createTeamMemberForAllBusinesses() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://dd:dd@cluster0.naz3cde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    
    console.log('🔄 Creating team member entries for dc@gmail.com in ALL businesses...');
    
    const userId = '68dbbc33218b4e1bbc9ea939';
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return;
    }
    console.log('✅ Found user:', user.email);
    
    // Get all businesses
    const allBusinesses = await Business.find();
    console.log(`📋 Found ${allBusinesses.length} businesses:`);
    
    for (const business of allBusinesses) {
      console.log(`\n🔄 Processing business: ${business.name} (${business._id})`);
      
      // Check if team member already exists
      const existingMember = await TeamMember.findOne({
        user: userId,
        business: business._id
      });
      
      if (existingMember) {
        console.log(`   ✅ Team member already exists with role: ${existingMember.role}`);
        
        if (!existingMember.active) {
          existingMember.active = true;
          await existingMember.save();
          console.log('   🔄 Activated team member');
        }
        continue;
      }
      
      // Create new team member with admin role
      const teamMember = await TeamMember.create({
        business: business._id,
        user: userId,
        name: user.firstName + ' ' + user.lastName,
        email: user.email,
        role: 'admin',
        permissions: [], // Empty array means inherit from role
        active: true,
        joinedAt: new Date()
      });
      
      console.log(`   ✅ Created new admin team member: ${teamMember._id}`);
    }
    
    console.log(`\n🎉 Finished processing all businesses for ${user.email}`);
    
    // Show summary
    const allTeamMembers = await TeamMember.find({ user: userId }).populate('business', 'name logoUrl');
    console.log(`\n📋 Summary: User ${user.email} is now a team member in ${allTeamMembers.length} businesses:`);
    allTeamMembers.forEach(member => {
      console.log(`   - ${member.business.name}: ${member.role} (Active: ${member.active})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
if (require.main === module) {
  createTeamMemberForAllBusinesses();
}

module.exports = { createTeamMemberForAllBusinesses };
