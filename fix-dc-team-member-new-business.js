// Script to create team member entry for the new business ID
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const TeamMember = require('./src/modules/businesses/teamMember.model');
const User = require('./src/modules/users/user.model');
const Business = require('./src/modules/businesses/business.model');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.join(__dirname, 'src', 'config', 'config.env') });

async function fixDcTeamMemberNewBusiness() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://dd:dd@cluster0.naz3cde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    
    console.log('🔄 Creating team member entry for dc@gmail.com in new business...');
    
    const userId = '68dbbc33218b4e1bbc9ea939';
    const newBusinessId = '68d7d7b32d372a364f7e3781';
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return;
    }
    console.log('✅ Found user:', user.email);
    
    // Verify business exists  
    const business = await Business.findById(newBusinessId);
    if (!business) {
      console.log('❌ Business not found:', newBusinessId);
      console.log('🔍 Let me check what businesses exist...');
      
      const allBusinesses = await Business.find().limit(10);
      console.log('📋 Available businesses:');
      allBusinesses.forEach(b => {
        console.log(`   - ${b._id}: ${b.name}`);
      });
      return;
    }
    console.log('✅ Found business:', business.name);
    
    // Check if team member already exists
    const existingMember = await TeamMember.findOne({
      user: userId,
      business: newBusinessId
    });
    
    if (existingMember) {
      console.log('✅ Team member already exists:', existingMember);
      console.log('   Role:', existingMember.role);
      console.log('   Active:', existingMember.active);
      console.log('   Permissions:', existingMember.permissions);
      
      if (!existingMember.active) {
        existingMember.active = true;
        await existingMember.save();
        console.log('✅ Activated existing team member');
      }
      return;
    }
    
    // Create new team member with admin role
    const teamMember = await TeamMember.create({
      business: newBusinessId,
      user: userId,
      name: user.firstName + ' ' + user.lastName,
      email: user.email,
      role: 'admin',
      permissions: [], // Empty array means inherit from role
      active: true,
      joinedAt: new Date()
    });
    
    console.log('✅ Created team member:');
    console.log('   ID:', teamMember._id);
    console.log('   Name:', teamMember.name);
    console.log('   Email:', teamMember.email);
    console.log('   Role:', teamMember.role);
    console.log('   Business:', teamMember.business);
    console.log('   User:', teamMember.user);
    
  } catch (error) {
    console.error('❌ Error creating team member:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
if (require.main === module) {
  fixDcTeamMemberNewBusiness();
}

module.exports = { fixDcTeamMemberNewBusiness };