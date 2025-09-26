const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const AppError = require('./shared/utils/appError');
const globalErrorHandler = require('./shared/middlewares/globalErrorHandler');
const setupCors = require('./shared/middlewares/cors.middleware');
const routes = require('./routes');

const app = express();

app.disable('x-powered-by');

// Apply enhanced CORS middleware first (before any other middleware)
app.use(setupCors);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Backup CORS configuration for additional security
const corsOptions = {
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'Cache-Control',
    'Pragma'
  ],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'WorkConnect API is healthy',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    version: '2.0.1'
  });
});

app.use('/api', routes);

app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});


app.use(globalErrorHandler);

module.exports = app;
