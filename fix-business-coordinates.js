const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.join(__dirname, 'src', 'config', 'config.env') });

// Connect to MongoDB
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is not set');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI);

const Business = require('./src/modules/businesses/business.model');

async function fixBusinessLocation() {
  try {
    console.log('🔧 Fixing business location coordinates...');
    
    // Find business with location but missing coordinates
    const business = await Business.findOne({
      'location.allowedRadius': { $exists: true },
      $or: [
        { 'location.latitude': { $exists: false } },
        { 'location.longitude': { $exists: false } },
        { 'location.latitude': null },
        { 'location.longitude': null }
      ]
    });
    
    if (!business) {
      console.log('❌ No business found with missing coordinates');
      return;
    }
    
    console.log(`📍 Found business: ${business.name}`);
    console.log(`   Current allowedRadius: ${business.location?.allowedRadius}`);
    console.log(`   Current coordinates: ${business.location?.latitude}, ${business.location?.longitude}`);
    
    // Set example coordinates (you should replace these with actual business coordinates)
    // Using Delhi, India coordinates as an example
    const exampleCoordinates = {
      latitude: 28.6139,  // Delhi latitude
      longitude: 77.2090, // Delhi longitude
    };
    
    console.log(`\n🔧 Updating coordinates to: ${exampleCoordinates.latitude}, ${exampleCoordinates.longitude}`);
    console.log('   (These are example coordinates for Delhi, India - replace with actual business location)');
    
    // Update the business location
    business.location.latitude = exampleCoordinates.latitude;
    business.location.longitude = exampleCoordinates.longitude;
    business.location.setAt = new Date();
    
    await business.save();
    
    console.log('✅ Business location updated successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update the coordinates to the actual business location');
    console.log('2. Test attendance clock-in near the business location');
    console.log('3. Adjust allowedRadius as needed using the edit business form');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixBusinessLocation();