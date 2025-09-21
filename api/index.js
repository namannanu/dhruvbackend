// Vercel serverless entry point
const server = require('../src/server');

const ensureDatabaseConnection =
  server.ensureDatabaseConnection || (() => Promise.resolve());

module.exports = async (req, res) => {
  try {
    await ensureDatabaseConnection();
  } catch (error) {
    console.error('MongoDB connection error during request:', error.message);
    res
      .status(500)
      .json({ status: 'error', message: 'Database connection failed' });
    return;
  }

  return server(req, res);
};
