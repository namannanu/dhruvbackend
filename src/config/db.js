const mongoose = require('mongoose');

let cachedDb = null;

const connectToDatabase = async () => {
    if (cachedDb) {
        return cachedDb;
    }

    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI environment variable is not defined');
    }

    try {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            connectTimeoutMS: 10000,
            retryWrites: true,
            w: 'majority'
        };

        const client = await mongoose.connect(process.env.MONGO_URI, opts);
        cachedDb = client;
        return client;
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        cachedDb = null;
        throw error;
    }
};

// Monitor the connection
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    cachedDb = null;
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
    cachedDb = null;
});

// Clean up on app termination
process.on('SIGTERM', () => {
    if (mongoose.connection.readyState === 1) {
        mongoose.connection.close()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    } else {
        process.exit(0);
    }
});

module.exports = connectToDatabase;

const connectDB = async () => {
  if (!config.uri) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(config.uri, config.options)
      .then((mongoose) => {
        cached.conn = mongoose;
        return mongoose;
      })
      .catch((error) => {
        cached.promise = null;
        cached.conn = null;
        console.error('MongoDB connection failed:', error);
        throw error;
      });
  }

  return cached.promise;
};

// Clean up on app termination
process.on('SIGTERM', () => {
  if (mongoose.connection.readyState === 1) {
    mongoose.connection.close()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    process.exit(0);
  }
});

module.exports = connectDB;

  try {
    if (!cached.promise) {
      const retryAttempts = 3;
      let lastError;

      for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
          console.log(`Connecting to MongoDB (attempt ${attempt}/${retryAttempts})...`);
          const mongoose = await global.mongoose.connect(MONGODB_URI, opts);
          console.log('MongoDB connected successfully');
          cached.promise = Promise.resolve(mongoose);
          break;
        } catch (error) {
          lastError = error;
          console.error(`Connection attempt ${attempt} failed:`, error.message);
          
          if (attempt === retryAttempts) {
            console.error('All connection attempts failed');
            cached.promise = null;
            throw lastError;
          }
          
          // Wait before next attempt (exponential backoff)
          const delay = Math.min(100 * Math.pow(2, attempt), 3000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    const opts = {
      bufferCommands: false,
      maxPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority',
      autoIndex: false
    };

        try {
          const mongoose = await global.mongoose.connect(MONGODB_URI, opts);
          console.log('MongoDB connected successfully');
          cached.promise = Promise.resolve(mongoose);
          return;
        } catch (error) {
          lastError = error;
          console.error(`Connection attempt ${attempt} failed:`, error.message);
          
          if (attempt === retryAttempts) {
            console.error('All connection attempts failed');
            cached.promise = null;
            throw error;
          }
          
          // Wait before next attempt (exponential backoff)
          const delay = Math.min(100 * Math.pow(2, attempt), 3000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
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
