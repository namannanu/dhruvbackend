const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const app = require('./app');

// Load environment variables, prioritising project-level .env if present.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.join(__dirname, 'config', 'config.env') });

const PORT = process.env.PORT || 3000;

let connectionPromise;

const ensureDatabaseConnection = () => {
  if (!connectionPromise) {
    connectionPromise = connectDB();
  }
  return connectionPromise;
};



const startServer = async () => {
  try {
    console.log('WorkConnect backend starting...');
    await ensureDatabaseConnection();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

const handler = async (req, res) => {
  try {
    await ensureDatabaseConnection();
    return app(req, res);
  } catch (error) {
    console.error('Failed to initialise MongoDB connection:', error.message);
    res
      .status(500)
      .json({ status: 'error', message: 'Database connection failed' });
  }
};

if (require.main === module) {
  startServer();
}

module.exports = handler;
module.exports.ensureDatabaseConnection = ensureDatabaseConnection;
module.exports.app = app;
