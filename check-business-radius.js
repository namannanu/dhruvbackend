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

async function checkBusinessRadius() {
  try {
    console.log('🔍 Checking business allowedRadius in database...');
    
    const businesses = await Business.find({}).limit(5);
    
    console.log(`Found ${businesses.length} businesses:`);
    businesses.forEach((business, index) => {
      console.log(`\n${index + 1}. Business: ${business.name}`);
      console.log(`   ID: ${business._id}`);
      console.log(`   Location exists: ${!!business.location}`);
      if (business.location) {
        console.log(`   Coordinates: ${business.location.latitude}, ${business.location.longitude}`);
        console.log(`   allowedRadius: ${business.location.allowedRadius}`);
        console.log(`   setAt: ${business.location.setAt}`);
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBusinessRadius();