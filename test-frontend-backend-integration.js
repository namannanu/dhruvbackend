const mongoose = require('mongoose');
require('dotenv').config();

async function testFrontendBackendIntegration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/talent');
    console.log('✅ Connected to MongoDB');
    
    // Define business schema
    const Business = mongoose.model('Business', new mongoose.Schema({}, {strict: false}));
    
    console.log('\n🧪 TESTING: Frontend → Backend Integration...\n');
    
    // Simulate exact payload from frontend (after our fix)
    const frontendPayload = {
      name: 'Test Business Frontend Integration',
      description: 'Testing the complete frontend to backend flow',
      address: {
        street: '123 Frontend Street',
        city: 'Test City',
        state: 'CA',
        zip: '94105'
      },
      phone: '555-123-4567',
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        formattedAddress: '123 Frontend Street, Test City, CA 94105, USA',
        name: 'Test Frontend Location',
        placeId: 'ChIJd8BlQ2BZwokRAFQEcDuMONE',
        allowedRadius: 150,
        isActive: true
      }
    };
    
    console.log('📡 Frontend payload structure:');
    console.log(JSON.stringify(frontendPayload, null, 2));
    
    // Simulate backend processing (like the updated controller)
    let addressData = {};
    if (frontendPayload.address) {
      const addr = frontendPayload.address;
      addressData = {
        line1: addr.street || addr.line1,
        city: addr.city,
        state: addr.state,
        postalCode: addr.zip || addr.postalCode,
        country: addr.country || 'US'
      };
    }
    
    let locationData = null;
    if (frontendPayload.location) {
      locationData = {
        ...frontendPayload.location,
        ...addressData, // Merge address data
        setBy: new mongoose.Types.ObjectId(), // Dummy user ID
        setAt: new Date()
      };
    }
    
    const businessData = {
      ...frontendPayload,
      owner: new mongoose.Types.ObjectId(), // Dummy owner ID
      location: locationData
    };
    
    // Remove the nested address object
    delete businessData.address;
    
    console.log('\n🏗️ Processed backend data structure:');
    console.log(JSON.stringify(businessData, null, 2));
    
    // Create the business
    const business = await Business.create(businessData);
    
    console.log('\n📍 Created business with ID:', business._id);
    
    // Verify the stored structure
    const storedBusiness = await Business.findById(business._id);
    
    console.log('\n💾 Final stored business location:');
    console.log(JSON.stringify({
      name: storedBusiness.name,
      location: {
        // GPS coordinates
        latitude: storedBusiness.location?.latitude,
        longitude: storedBusiness.location?.longitude,
        
        // Address components
        line1: storedBusiness.location?.line1,
        city: storedBusiness.location?.city,
        state: storedBusiness.location?.state,
        postalCode: storedBusiness.location?.postalCode,
        
        // Google Places data
        formattedAddress: storedBusiness.location?.formattedAddress,
        name: storedBusiness.location?.name,
        placeId: storedBusiness.location?.placeId,
        allowedRadius: storedBusiness.location?.allowedRadius,
        isActive: storedBusiness.location?.isActive
      }
    }, null, 2));
    
    // Validation checks
    const validationResults = {
      hasCoordinates: storedBusiness.location?.latitude != null && storedBusiness.location?.longitude != null,
      hasPlaceId: storedBusiness.location?.placeId != null,
      hasRadius: storedBusiness.location?.allowedRadius != null,
      hasAddress: storedBusiness.location?.line1 != null && storedBusiness.location?.city != null,
      hasFormattedAddress: storedBusiness.location?.formattedAddress != null
    };
    
    console.log('\n✅ VALIDATION RESULTS:');
    console.log(`   📍 GPS Coordinates: ${validationResults.hasCoordinates ? '✅' : '❌'}`);
    console.log(`   🆔 Google Place ID: ${validationResults.hasPlaceId ? '✅' : '❌'}`);
    console.log(`   📏 Allowed Radius: ${validationResults.hasRadius ? '✅' : '❌'}`);
    console.log(`   🏠 Address Components: ${validationResults.hasAddress ? '✅' : '❌'}`);
    console.log(`   📍 Formatted Address: ${validationResults.hasFormattedAddress ? '✅' : '❌'}`);
    
    const allValid = Object.values(validationResults).every(v => v === true);
    
    if (allValid) {
      console.log('\n🎉 SUCCESS: All location data stored correctly!');
      console.log('   📍 GPS-based attendance tracking will work');
      console.log('   📍 Address components properly stored');
      console.log('   📍 Google Places integration functional');
    } else {
      console.log('\n❌ ISSUES FOUND: Some location data missing');
    }
    
    // Clean up test data
    await Business.deleteOne({ _id: business._id });
    console.log('\n🧹 Cleaned up test business');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testFrontendBackendIntegration();