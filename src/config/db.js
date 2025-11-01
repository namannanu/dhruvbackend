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

const connectDB = async (retryCount = 0) => {
  const MAX_RETRIES = 3;
  
  if (!MONGODB_URI) {
    throw new Error('MONGO_URI environment variable is not set. Please check your .env file.');
  }

  // Return existing connection if available and not stale
  if (cached.conn && cached.conn.readyState === 1) {
    return cached.conn;
  }

  try {
    if (!cached.promise) {
      const opts = {
        bufferCommands: false,
        maxPoolSize: 1, // Reduced for serverless
        minPoolSize: 0,
        maxIdleTimeMS: 10000, // Close connections after 10 seconds of inactivity
        serverSelectionTimeoutMS: 8000, // Increased for better reliability
        socketTimeoutMS: 0, // Disable socket timeout
        connectTimeoutMS: 8000, // Increased for better reliability
        family: 4,
        retryWrites: true,
        retryReads: true,
        w: 'majority',
        heartbeatFrequencyMS: 10000,
        autoIndex: process.env.NODE_ENV !== 'production',
        // Additional serverless optimizations
        keepAlive: true,
        keepAliveInitialDelay: 0,
        directConnection: false,
        compressors: ['snappy', 'zlib']
      };

      // Store the promise, not the await result
      cached.promise = mongoose.connect(MONGODB_URI, opts);
    }

    // Await the cached promise with timeout
    cached.conn = await Promise.race([
      cached.promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]);
    
    console.log('✅ MongoDB connected successfully');
    return cached.conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    cached.promise = null;
    cached.conn = null;
    
    // Retry logic for serverless environments
    if (retryCount < MAX_RETRIES && (
      error.message.includes('timeout') || 
      error.message.includes('ENOTFOUND') ||
      error.message.includes('MongoNetworkTimeoutError')
    )) {
      console.log(`Retrying connection... Attempt ${retryCount + 1}/${MAX_RETRIES}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
      return connectDB(retryCount + 1);
    }
    
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
