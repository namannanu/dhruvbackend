const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, 'src', 'config', 'config.env') });

const User = require('./src/modules/users/user.model');

const checkUsers = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if any users exist
    const userCount = await User.countDocuments();
    console.log(`Total users in database: ${userCount}`);

    // Check for specific user
    const testUser = await User.findOne({ email: 'p@gmail.com' });
    if (testUser) {
      console.log('User p@gmail.com found:', {
        id: testUser._id,
        email: testUser.email,
        userType: testUser.userType,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        createdAt: testUser.createdAt
      });
    } else {
      console.log('User p@gmail.com not found');
      
      // Create a test user
      console.log('Creating test user...');
      const newUser = await User.create({
        email: 'p@gmail.com',
        password: 'password',
        userType: 'employer',
        firstName: 'Test',
        lastName: 'User'
      });
      console.log('Test user created:', {
        id: newUser._id,
        email: newUser.email,
        userType: newUser.userType
      });
    }

    // List all users (for debugging)
    const allUsers = await User.find().select('email userType firstName lastName createdAt');
    console.log('\nAll users in database:');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.userType}) - ${user.firstName} ${user.lastName}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

checkUsers();