const mongoose = require('mongoose');
const connectDB = require('../../config/db');

const dbHealthCheck = async (req, res, next) => {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('Database connection lost, attempting to reconnect...');
      await connectDB();
    }
    
    // Quick ping to ensure connection is alive
    await mongoose.connection.db.admin().ping();
    next();
  } catch (error) {
    console.error('Database health check failed:', error);
    
    // Try to reconnect once
    try {
      await connectDB();
      next();
    } catch (reconnectError) {
      console.error('Failed to reconnect to database:', reconnectError);
      return res.status(503).json({
        status: 'error',
        message: 'Database service temporarily unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }
  }
};

module.exports = dbHealthCheck;