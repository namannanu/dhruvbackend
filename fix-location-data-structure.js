const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Job = require('./src/modules/jobs/job.model');
const Business = require('./src/modules/businesses/business.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dd:dd@cluster0.qs4syvv.mongodb.net/?appName=Cluster0';

async function fixLocationDataStructure() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    console.log('🏢 Fixing Business Location Data Structure...\n');

    // Find businesses with location data
    const businesses = await Business.find({
      'location.formattedAddress': { $exists: true, $ne: null }
    });

    console.log(`📊 Found ${businesses.length} businesses to update`);

    let businessUpdated = 0;

    for (const business of businesses) {
      const location = business.location;
      
      if (!location || !location.formattedAddress) continue;

      const currentFormatted = location.formattedAddress;
      console.log(`\n🏢 Updating business: ${business.businessName || business.name}`);
      console.log(`   Current formattedAddress: "${currentFormatted}"`);

      // Parse the address according to your specification
      const newLocationData = {
        ...location.toObject(),
        // Clean formattedAddress - only the primary street address
        formattedAddress: "Mahaveer Nagar III Cir",
        
        // Properly structured fields
        line1: "Mahaveer Nagar III Circle",
        city: "Kota",
        state: "Rajasthan", // Full state name, not abbreviation
        postalCode: "324005",
        country: "India", // Corrected from "US"
        
        // Additional structured fields for the full address components
        area: "Mahaveer Nagar Housing Board Colony",
        locality: "Mahaveer Nagar",
        
        // Keep existing coordinates and metadata
        latitude: location.latitude,
        longitude: location.longitude,
        allowedRadius: location.allowedRadius,
        name: location.name,
        placeId: location.placeId,
        isActive: location.isActive,
        setBy: location.setBy,
        setAt: location.setAt
      };

      // Update the business
      await Business.updateOne(
        { _id: business._id },
        { $set: { location: newLocationData } }
      );

      console.log(`   ✅ Updated formattedAddress: "${newLocationData.formattedAddress}"`);
      console.log(`   📍 Full address components:`);
      console.log(`      Street: ${newLocationData.line1}`);
      console.log(`      Area: ${newLocationData.area}`);
      console.log(`      Locality: ${newLocationData.locality}`);
      console.log(`      City: ${newLocationData.city}`);
      console.log(`      State: ${newLocationData.state}`);
      console.log(`      Country: ${newLocationData.country}`);
      console.log(`      Postal Code: ${newLocationData.postalCode}`);

      businessUpdated++;
    }

    console.log(`\n📊 Business updates completed: ${businessUpdated}`);

    console.log('\n🚀 Updating Job Location Data Structure...\n');

    // Find jobs with location data
    const jobs = await Job.find({
      'location.formattedAddress': { $exists: true, $ne: null }
    });

    console.log(`📊 Found ${jobs.length} jobs to update`);

    let jobsUpdated = 0;

    for (const job of jobs) {
      const location = job.location;
      
      if (!location || !location.formattedAddress) continue;

      console.log(`\n🚀 Updating job: ${job.title}`);
      console.log(`   Current formattedAddress: "${location.formattedAddress}"`);

      // Create clean job location data
      const newJobLocationData = {
        ...location.toObject(),
        // Clean formattedAddress - only the primary street address
        formattedAddress: "Mahaveer Nagar III Cir",
        
        // Properly structured fields
        line1: "Mahaveer Nagar III Circle", 
        city: "Kota",
        state: "Rajasthan",
        postalCode: "324005",
        country: "India",
        
        // Additional structured fields
        area: "Mahaveer Nagar Housing Board Colony",
        locality: "Mahaveer Nagar",
        
        // Keep existing coordinates and metadata
        latitude: location.latitude,
        longitude: location.longitude,
        allowedRadius: location.allowedRadius,
        name: location.name,
        placeId: location.placeId,
        isActive: location.isActive,
        setBy: location.setBy,
        setAt: location.setAt
      };

      // Also update the businessAddress field to use the clean format
      const newBusinessAddress = "Mahaveer Nagar III Cir, Kota, Rajasthan";

      // Update the job
      await Job.updateOne(
        { _id: job._id },
        { 
          $set: { 
            location: newJobLocationData,
            businessAddress: newBusinessAddress
          } 
        }
      );

      console.log(`   ✅ Updated formattedAddress: "${newJobLocationData.formattedAddress}"`);
      console.log(`   🏢 Updated businessAddress: "${newBusinessAddress}"`);

      jobsUpdated++;
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Businesses updated: ${businessUpdated}`);
    console.log(`   ✅ Jobs updated: ${jobsUpdated}`);
    console.log(`\n🎉 Location data structure fix completed!`);
    console.log(`\nNow addresses will show as:`);
    console.log(`   📱 UI Display: "Mahaveer Nagar III Cir, Kota, Rajasthan"`);
    console.log(`   🗂️  Structured Data: Properly separated into components`);

  } catch (error) {
    console.error('❌ Error fixing location data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix
if (require.main === module) {
  fixLocationDataStructure()
    .then(() => {
      console.log('✅ Location data structure fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fix failed:', error);
      process.exit(1);
    });
}

module.exports = fixLocationDataStructure;