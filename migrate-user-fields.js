// Migration script to clean up user type-specific fields
// Run this once to fix existing user records

const mongoose = require('mongoose');
const User = require('./src/modules/users/user.model');

async function cleanupUserFields() {
  try {
    console.log('🔧 Starting user field cleanup migration...');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workconnect');
    
    // Clean up worker records - remove employer-specific fields
    const workerUpdateResult = await User.updateMany(
      { userType: 'worker' },
      { 
        $unset: { 
          freeJobsPosted: "",
          selectedBusiness: ""
        },
        $set: {
          freeApplicationsUsed: 0  // Ensure this field exists for workers
        }
      }
    );
    
    console.log(`✅ Updated ${workerUpdateResult.modifiedCount} worker records`);
    
    // Clean up employer records - remove worker-specific fields
    const employerUpdateResult = await User.updateMany(
      { userType: 'employer' },
      { 
        $unset: { 
          freeApplicationsUsed: ""
        },
        $set: {
          freeJobsPosted: 0  // Ensure this field exists for employers
        }
      }
    );
    
    console.log(`✅ Updated ${employerUpdateResult.modifiedCount} employer records`);
    
    // Show current state
    const workerCount = await User.countDocuments({ userType: 'worker' });
    const employerCount = await User.countDocuments({ userType: 'employer' });
    
    console.log(`\n📊 Current user distribution:`);
    console.log(`   Workers: ${workerCount}`);
    console.log(`   Employers: ${employerCount}`);
    
    // Sample a few records to verify
    console.log('\n🔍 Sample records after cleanup:');
    
    const sampleWorker = await User.findOne({ userType: 'worker' }).select('email userType freeJobsPosted freeApplicationsUsed selectedBusiness');
    if (sampleWorker) {
      console.log('   Worker sample:', {
        email: sampleWorker.email,
        userType: sampleWorker.userType,
        freeJobsPosted: sampleWorker.freeJobsPosted, // Should be undefined
        freeApplicationsUsed: sampleWorker.freeApplicationsUsed, // Should be defined
        selectedBusiness: sampleWorker.selectedBusiness // Should be undefined
      });
    }
    
    const sampleEmployer = await User.findOne({ userType: 'employer' }).select('email userType freeJobsPosted freeApplicationsUsed selectedBusiness');
    if (sampleEmployer) {
      console.log('   Employer sample:', {
        email: sampleEmployer.email,
        userType: sampleEmployer.userType,
        freeJobsPosted: sampleEmployer.freeJobsPosted, // Should be defined
        freeApplicationsUsed: sampleEmployer.freeApplicationsUsed, // Should be undefined
        selectedBusiness: sampleEmployer.selectedBusiness // Can be defined
      });
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the migration
if (require.main === module) {
  cleanupUserFields();
}

module.exports = cleanupUserFields;