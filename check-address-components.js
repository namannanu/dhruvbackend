const mongoose = require('mongoose');
const Business = require('./src/modules/businesses/business.model');

async function checkAddressComponents() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/talent', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find a business with location data
    const business = await Business.findOne({ 'location.city': 'Kota' });
    
    if (business) {
      console.log('\n📍 Business Location Data:');
      console.log('Business Name:', business.name);
      console.log('Location Object:', JSON.stringify(business.location, null, 2));
      
      // Show each component
      if (business.location) {
        console.log('\n🔍 Address Components:');
        console.log('formattedAddress:', business.location.formattedAddress);
        console.log('line1:', business.location.line1);
        console.log('city:', business.location.city);
        console.log('state:', business.location.state);
        console.log('postalCode:', business.location.postalCode);
        console.log('country:', business.location.country);
      }
    } else {
      console.log('❌ No business found with location data');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

checkAddressComponents();