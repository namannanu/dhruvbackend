const mongoose = require('mongoose');

// Cache the database connection
const MONGODB_URI = process.env.MONGO_URI;
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    console.log('Using cached database connection');
    return cached.conn;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  if (!cached.promise) {
    console.log('Creating new database connection...');
    
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

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('MongoDB connected successfully');
        return mongoose;
      })
      .catch((err) => {
        console.error('MongoDB connection error:', err);
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
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
