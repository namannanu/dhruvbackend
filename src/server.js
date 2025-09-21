const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const app = require('./app');

dotenv.config({
  path: path.join(__dirname, 'config', 'config.env')
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    console.log('WorkConnect backend starting...');
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
