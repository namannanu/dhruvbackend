const mongoose = require('mongoose');
const Business = require('./src/modules/businesses/business.model');

async function updateBusinessFormattedAddress() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/talent', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find businesses that have location but missing formattedAddress
    const businesses = await Business.find({
      'location.city': 'Kota',
      'location.line1': { $exists: true }
    });

    console.log(`📊 Found ${businesses.length} businesses to update`);

    for (const business of businesses) {
      console.log(`\n🏢 Updating business: ${business.name}`);
      console.log('📍 Current location:', JSON.stringify(business.location, null, 2));

      // Add formattedAddress to the business location
      if (!business.location.formattedAddress) {
        business.location.formattedAddress = "Mahaveer Nagar III Cir";
        
        await business.save();
        console.log('✅ Updated with formattedAddress:', business.location.formattedAddress);
      } else {
        console.log('ℹ️  formattedAddress already exists:', business.location.formattedAddress);
      }
    }

    console.log('\n🎉 Business locations updated successfully!');
    
    // Verify the update
    const updatedBusiness = await Business.findOne({ 'location.city': 'Kota' });
    if (updatedBusiness) {
      console.log('\n🔍 Verification - Updated business location:');
      console.log(JSON.stringify(updatedBusiness.location, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

updateBusinessFormattedAddress();