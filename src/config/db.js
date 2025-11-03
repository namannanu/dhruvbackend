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
        // SSL/TLS Configuration for Atlas
        tls: true,
        tlsCAFile: undefined, // Use default CA bundle
        tlsAllowInvalidCertificates: false,
        tlsAllowInvalidHostnames: false,
        directConnection: false,
        // Remove compression for Atlas compatibility
        authSource: 'admin',
        readPreference: 'primary'
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
    
    // Handle specific Atlas errors
    if (error.message.includes('IP whitelist') || error.message.includes('not whitelisted')) {
      console.error('🚨 IP Whitelist Error: Add 0.0.0.0/0 to your MongoDB Atlas Network Access');
      throw new Error('Database connection failed: IP not whitelisted. Please add 0.0.0.0/0 to MongoDB Atlas Network Access.');
    }
    
    if (error.message.includes('SSL') || error.message.includes('TLS')) {
      console.error('🚨 SSL/TLS Error: MongoDB Atlas SSL connection failed');
      throw new Error('Database connection failed: SSL/TLS error. Please check MongoDB Atlas configuration.');
    }
    
    // Retry logic for serverless environments
    if (retryCount < MAX_RETRIES && (
      error.message.includes('timeout') || 
      error.message.includes('ENOTFOUND') ||
      error.message.includes('MongoNetworkTimeoutError') ||
      error.message.includes('MongoServerSelectionError')
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
