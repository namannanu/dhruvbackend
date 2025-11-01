const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGO_URI;

// Global connection caching for serverless environments
if (!global.mongoose) {
  global.mongoose = {
    conn: null,
    promise: null
  };
}

let cached = global.mongoose;

// Monitor the connection
mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  cached.conn = null;
  cached.promise = null;
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  cached.conn = null;
  cached.promise = null;
});

const connectDB = async () => {
  if (!MONGODB_URI) {
    throw new Error('MONGO_URI environment variable is not set. Please check your .env file.');
  }

  // Return existing connection if available
  if (cached.conn) {
    return cached.conn;
  }

  try {
    if (!cached.promise) {
      const opts = {
        bufferCommands: false,
        maxPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
        connectTimeoutMS: 10000,
        retryWrites: true,
        w: 'majority',
        autoIndex: process.env.NODE_ENV !== 'production'
      };

      // Store the promise, not the await result
      cached.promise = mongoose.connect(MONGODB_URI, opts);
    }

    // Await the cached promise
    cached.conn = await cached.promise;
    console.log('✅ MongoDB connected successfully');
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

// Clean up on app termination
process.on('SIGTERM', async () => {
  if (cached.conn) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
  }
  process.exit(0);
});

module.exports = connectDB;
