const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

async function testBuildBusinessCollections() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected successfully');

    // Import required models
    const User = require('./src/modules/users/user.model');
    
    // Find a user with team access
    const userWithTeamAccess = await User.findOne({ email: 'y@y.com' });
    if (!userWithTeamAccess) {
      console.log('❌ User y@y.com not found');
      return;
    }

    console.log(`👤 Testing buildBusinessCollections with user: ${userWithTeamAccess.email} (ID: ${userWithTeamAccess._id})`);

    // We need to copy the buildBusinessCollections function here to test it directly
    const TeamMember = require('./src/modules/businesses/teamMember.model');
    const TeamAccess = require('./src/modules/team/teamAccess.model');
    const Business = require('./src/modules/businesses/business.model');

    const buildBusinessCollections = async (userId) => {
      // Get user email for TeamAccess query
      const user = await User.findById(userId).select('email');
      if (!user) {
        throw new Error('User not found');
      }

      const [ownedBusinesses, teamMemberships, teamAccessRecords] = await Promise.all([
        Business.find({ owner: userId }).select('name industry createdAt logoUrl'),
        TeamMember.find({ user: userId, active: true })
          .populate('business', 'name industry createdAt logoUrl')
          .sort({ createdAt: -1 }),
        TeamAccess.find({ 
          userEmail: user.email.toLowerCase(), 
          status: 'active' 
        })
          .populate('businessContext.businessId', 'name industry createdAt logoUrl')
          .sort({ createdAt: -1 })
      ]);

      console.log(`📊 Query results:`);
      console.log(`  - ownedBusinesses: ${ownedBusinesses.length}`);
      console.log(`  - teamMemberships: ${teamMemberships.length}`);
      console.log(`  - teamAccessRecords: ${teamAccessRecords.length}`);

      // Combine team memberships from both models
      const combinedTeamBusinesses = [];
      
      // Add TeamMember records
      teamMemberships
        .filter((membership) => membership.business)
        .forEach((membership) => {
          console.log(`  📝 Adding TeamMember: ${membership.business.name}`);
          combinedTeamBusinesses.push({
            businessId: membership.business._id,
            businessName: membership.business.name,
            industry: membership.business.industry || null,
            logoUrl: membership.business.logoUrl || null,
            role: membership.role,
            permissions: membership.permissions,
            joinedAt: membership.createdAt,
            source: 'teamMember'
          });
        });

      // Add TeamAccess records
      teamAccessRecords
        .filter((access) => access.businessContext?.businessId)
        .forEach((access) => {
          const business = access.businessContext.businessId;
          if (business) {
            console.log(`  🔑 Adding TeamAccess: ${business.name}`);
            combinedTeamBusinesses.push({
              businessId: business._id,
              businessName: business.name,
              industry: business.industry || null,
              logoUrl: business.logoUrl || null,
              role: access.role,
              accessLevel: access.accessLevel,
              permissions: access.permissions,
              joinedAt: access.createdAt,
              grantedBy: access.grantedBy,
              source: 'teamAccess'
            });
          }
        });

      // Remove duplicates (same business from both sources)
      const uniqueTeamBusinesses = [];
      const seenBusinessIds = new Set();
      
      combinedTeamBusinesses.forEach((business) => {
        const businessIdStr = business.businessId.toString();
        if (!seenBusinessIds.has(businessIdStr)) {
          seenBusinessIds.add(businessIdStr);
          uniqueTeamBusinesses.push(business);
        }
      });

      return {
        ownedBusinesses: ownedBusinesses.map((business) => ({
          businessId: business._id,
          businessName: business.name,
          industry: business.industry || null,
          createdAt: business.createdAt,
          logoUrl: business.logoUrl || null
        })),
        teamBusinesses: uniqueTeamBusinesses,
        teamMemberships: teamMemberships,
        teamAccessRecords: teamAccessRecords
      };
    };

    // Test the function
    const result = await buildBusinessCollections(userWithTeamAccess._id);

    console.log('\n🎉 buildBusinessCollections result:');
    console.log(`  - ownedBusinesses: ${result.ownedBusinesses.length}`);
    console.log(`  - teamBusinesses: ${result.teamBusinesses.length}`);
    
    if (result.teamBusinesses.length > 0) {
      console.log('\n📋 Team businesses:');
      result.teamBusinesses.forEach((business, index) => {
        console.log(`  ${index + 1}. ${business.businessName} (${business.source})`);
        console.log(`     - ID: ${business.businessId}`);
        console.log(`     - Role: ${business.role}`);
        if (business.accessLevel) console.log(`     - Access Level: ${business.accessLevel}`);
      });
    } else {
      console.log('⚠️ No team businesses found');
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testBuildBusinessCollections();
