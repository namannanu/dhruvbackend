const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

const TeamAccess = require('./src/modules/team/teamAccess.model');
const User = require('./src/modules/users/user.model');
const Business = require('./src/modules/businesses/business.model');

async function setupBusinessHierarchy() {
  try {
    console.log('🏢 Setting up business access hierarchy...');

    // Get existing users
    const primaryOwner = await User.findOne({ email: 'p@example.com' });
    const teamMember = await User.findOne({ email: 'b@example.com' });

    if (!primaryOwner || !teamMember) {
      console.log('❌ Required users not found');
      process.exit(1);
    }

    console.log(`👤 Primary Owner: ${primaryOwner.email} (${primaryOwner._id})`);
    console.log(`👤 Team Member: ${teamMember.email} (${teamMember._id})`);

    // Create a business for the primary owner
    let primaryBusiness = await Business.findOne({ owner: primaryOwner._id });
    if (!primaryBusiness) {
      primaryBusiness = new Business({
        owner: primaryOwner._id,
        name: 'Primary Business Corp',
        description: 'Main business owned by primary owner',
        type: 'Technology'
      });
      await primaryBusiness.save();
      console.log(`✅ Created primary business: ${primaryBusiness._id}`);
    } else {
      console.log(`📋 Using existing primary business: ${primaryBusiness._id}`);
    }

    // Update the existing TeamAccess record for b@example.com
    // This represents p@example.com giving access to b@example.com for their business
    const existingAccess = await TeamAccess.findOne({ userEmail: teamMember.email });
    if (existingAccess) {
      console.log('📝 Updating existing TeamAccess for business-specific access...');
      
      // Set this as business-specific access to the primary owner's business
      existingAccess.businessContext = {
        businessId: primaryBusiness._id,
        allBusinesses: false,
        canCreateNewBusiness: true,  // Allow them to create their own businesses too
        canGrantAccessToOthers: false // Don't allow granting access to primary owner's business
      };
      existingAccess.accessScope = 'business_specific';
      existingAccess.originalUser = primaryOwner._id; // The business they have access to belongs to this user
      
      await existingAccess.save();
      console.log('✅ Updated TeamAccess for business-specific hierarchy');
    }

    // Create a separate TeamAccess record for independent business creation
    const independentAccess = await TeamAccess.findOne({ 
      userEmail: teamMember.email,
      accessScope: 'independent_operator'
    });

    if (!independentAccess) {
      const newIndependentAccess = new TeamAccess({
        userEmail: teamMember.email,
        employeeId: teamMember._id,
        originalUser: teamMember._id, // They are the original user for their own businesses
        grantedBy: teamMember._id,    // Self-granted for independence
        accessLevel: 'manage_operations',
        businessContext: {
          allBusinesses: true,          // All businesses they own
          canCreateNewBusiness: true,   // Can create new businesses
          canGrantAccessToOthers: true  // Can grant access to their own businesses
        },
        accessScope: 'independent_operator',
        reason: 'Independent business operator - can create and manage own businesses',
        status: 'active'
      });

      await newIndependentAccess.save();
      console.log('✅ Created independent operator access for b@example.com');
    }

    console.log('\n📋 Access Hierarchy Summary:');
    console.log('1. p@example.com (Primary Owner):');
    console.log(`   - Owns business: ${primaryBusiness.name} (${primaryBusiness._id})`);
    console.log('   - Full control as business owner');
    
    console.log('2. b@example.com (Team Member + Independent Operator):');
    console.log(`   - Has access to manage: ${primaryBusiness.name} (business-specific)`);
    console.log('   - Can create own businesses (independent operator)');
    console.log('   - Can grant access to people for their own businesses');
    console.log('   - Cannot grant access to primary owner\'s business');

    console.log('\n🎯 This setup provides:');
    console.log('✅ Clear separation between managing others\' businesses vs own businesses');
    console.log('✅ Business-specific permissions and scope');
    console.log('✅ Hierarchical access control');
    console.log('✅ Independent business creation capabilities');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up hierarchy:', error);
    process.exit(1);
  }
}

setupBusinessHierarchy();