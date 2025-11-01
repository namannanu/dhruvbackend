const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const AppError = require('./shared/utils/appError');
const globalErrorHandler = require('./shared/middlewares/globalErrorHandler');
const requestTimeout = require('./shared/middlewares/requestTimeout');
const routes = require('./routes');

const app = express();

app.disable('x-powered-by');

const corsOptions = {
  origin: '*', // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'X-Business-Id',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'Access-Control-Allow-Origin'
  ],
  exposedHeaders: [
    'Set-Cookie',
    'Authorization',
    'X-Auth-Token'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Enable CORS preflight for all routes
app.options('*', cors(corsOptions));

// Apply CORS middleware
app.use(cors(corsOptions));

// Add headers to allow CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, X-Business-Id');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Add request timeout middleware for serverless environments
if (process.env.NODE_ENV === 'production') {
  app.use(requestTimeout(25000)); // 25 second timeout for Vercel
}

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'WorkConnect API is healthy - Premium payments enabled',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', routes);

app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});


app.use(globalErrorHandler);

module.exports = app;
