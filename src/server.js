const dotenv = require('dotenv');
const path = require('path');

// Load environment variables with explicit paths
const envPath = path.resolve(__dirname, '..', '.env');
const configEnvPath = path.join(__dirname, 'config', 'config.env');

// Load .env first (higher priority)
dotenv.config({ path: envPath });
// Then load config.env as fallback
dotenv.config({ path: configEnvPath });

const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    console.log('WorkConnect backend starting...');
    
    // Connect to MongoDB
    await connectDB().catch(err => {
      console.error('Failed to connect to MongoDB:', err);
      process.exit(1);
    });

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('Unhandled Promise Rejection:', err);
      // Don't exit the process in production, just log the error
      if (process.env.NODE_ENV === 'development') {
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Serverless handler for Vercel
const handler = async (req, res) => {
  try {
    // Set timeout for the entire request
    req.setTimeout = req.setTimeout || function() {};
    res.setTimeout = res.setTimeout || function() {};
    
    // Connect to MongoDB with error handling
    await connectDB();
    
    // Set CORS headers for serverless
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Business-Id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    return app(req, res);
  } catch (error) {
    console.error('Server error:', error);
    
    // Handle specific MongoDB Atlas errors
    if (error.message.includes('IP whitelist') || error.message.includes('not whitelisted')) {
      return res.status(503).json({
        status: 'error',
        message: 'Database access restricted. Please contact administrator.',
        code: 'DB_ACCESS_DENIED'
      });
    }
    
    if (error.message.includes('SSL') || error.message.includes('TLS')) {
      return res.status(503).json({
        status: 'error',
        message: 'Database connection security error. Please try again.',
        code: 'DB_SSL_ERROR'
      });
    }
    
    // Handle specific MongoDB timeout errors
    if (error.message.includes('timeout') || error.name === 'MongoNetworkTimeoutError') {
      return res.status(503).json({
        status: 'error',
        message: 'Database connection timeout. Please try again.',
        code: 'DB_TIMEOUT'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error'
    });
  }
};

// Start server if running directly (not in serverless environment)
if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

// Export handler for serverless
module.exports = handler;
