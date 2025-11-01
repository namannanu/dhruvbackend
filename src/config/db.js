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

  // Handle connection errors
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    isConnected = false;
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
    isConnected = false;
  });

  // Handle process termination
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    } catch (err) {
      console.error('Error during MongoDB connection closure:', err);
      process.exit(1);
    }
  });

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 1, // Reduce for serverless
      serverSelectionTimeoutMS: 5000, // Reduce selection timeout
      socketTimeoutMS: 10000, // Reduce socket timeout
      keepAlive: true, // Enable keep-alive
      keepAliveInitialDelay: 300000, // 5 minutes
      connectTimeoutMS: 10000, // Connection timeout
      retryWrites: true,
      w: 'majority',
      // Auto create indexes in production is not recommended
      autoIndex: process.env.NODE_ENV !== 'production'
    });
    isConnected = true;
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
};

module.exports = connectDB;
