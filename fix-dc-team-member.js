// Script to create team member entry for dc@gmail.com
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const TeamMember = require('./src/modules/businesses/teamMember.model');
const User = require('./src/modules/users/user.model');
const Business = require('./src/modules/businesses/business.model');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.join(__dirname, 'src', 'config', 'config.env') });

async function fixDcTeamMember() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://dd:dd@cluster0.naz3cde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    
    console.log('🔄 Creating team member entry for dc@gmail.com...');
    
    const userId = '68dbbc33218b4e1bbc9ea939';
    const businessId = '68dbbc34218b4e1bbc9ea93d';
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return;
    }
    console.log('✅ Found user:', user.email);
    
    // Verify business exists  
    const business = await Business.findById(businessId);
    if (!business) {
      console.log('❌ Business not found:', businessId);
      return;
    }
    console.log('✅ Found business:', business.name);
    
    // Check if team member already exists
    const existingMember = await TeamMember.findOne({
      user: userId,
      business: businessId
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
      business: businessId,
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
  fixDcTeamMember();
}

module.exports = { fixDcTeamMember };