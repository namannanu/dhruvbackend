const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const app = require('./app');

// Load environment variables, prioritising project-level .env if present.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.join(__dirname, 'config', 'config.env') });

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
    // Connect to MongoDB if not already connected
    await connectDB().catch(err => {
      console.error('Failed to connect to MongoDB:', err);
      throw err;
    });
    
    // Handle the request
    return app(req, res);
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
