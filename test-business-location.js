const mongoose = require('mongoose');
require('dotenv').config();

async function testBusinessWithLocation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/talent');
    console.log('✅ Connected to MongoDB');
    
    // Define business schema for testing
    const Business = mongoose.model('Business', new mongoose.Schema({}, {strict: false}));
    
    console.log('\n🧪 TESTING: Creating a business with location data...\n');
    
    // Simulate what the frontend should now send
    const testBusinessData = {
      name: 'Test Business With Location',
      description: 'A test business to verify location storage',
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'CA',
        zip: '12345'
      },
      phone: '555-123-4567',
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        formattedAddress: '123 Test Street, Test City, CA 12345, USA',
        name: 'Test Business Location',
        placeId: 'test_place_id_123',
        allowedRadius: 150.0,
        isActive: true
      }
    };
    
    // Create the business (simulating API call)
    const business = await Business.create({
      ...testBusinessData,
      owner: new mongoose.Types.ObjectId(), // Dummy owner ID
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('📍 Created business with ID:', business._id);
    console.log('📍 Business location data:');
    console.log(JSON.stringify({
      name: business.name,
      location: {
        latitude: business.location?.latitude,
        longitude: business.location?.longitude,
        formattedAddress: business.location?.formattedAddress,
        name: business.location?.name,
        placeId: business.location?.placeId,
        allowedRadius: business.location?.allowedRadius,
        isActive: business.location?.isActive
      }
    }, null, 2));
    
    // Verify the location data was stored properly
    const storedBusiness = await Business.findById(business._id);
    
    if (storedBusiness.location && 
        storedBusiness.location.latitude != null && 
        storedBusiness.location.longitude != null) {
      console.log('\n✅ SUCCESS: Location data stored correctly!');
      console.log(`   📍 Coordinates: ${storedBusiness.location.latitude}, ${storedBusiness.location.longitude}`);
      console.log(`   📍 Place ID: ${storedBusiness.location.placeId}`);
      console.log(`   📍 Radius: ${storedBusiness.location.allowedRadius}m`);
    } else {
      console.log('\n❌ FAILURE: Location data not stored properly');
    }
    
    // Clean up test data
    await Business.deleteOne({ _id: business._id });
    console.log('\n🧹 Cleaned up test business');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testBusinessWithLocation();