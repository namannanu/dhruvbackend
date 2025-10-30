const mongoose = require('mongoose');

let isConnected = false; // track connection state

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  mongoose.set('strictQuery', true);
  mongoose.set('strictPopulate', false);

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,  // extra safety
    });
    isConnected = true;
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
};

module.exports = connectDB;
