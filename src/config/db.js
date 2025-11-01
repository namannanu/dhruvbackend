const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection) {
    console.log('Using cached database connection');
    return cachedConnection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  try {
    console.log('Creating new database connection...');
    
    // Serverless-friendly options
    const opts = {
      bufferCommands: false,
      maxPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      connectTimeoutMS: 10000,
      keepAlive: true,
      keepAliveInitialDelay: 300000,
      retryWrites: true,
      w: 'majority',
      autoIndex: false
    };

    // Create connection
    const connection = await mongoose.connect(process.env.MONGO_URI, opts);
    
    // Cache the connection
    cachedConnection = connection;
    
    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      cachedConnection = null;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      cachedConnection = null;
    });

    // Return the connection
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }

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
