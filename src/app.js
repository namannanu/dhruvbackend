const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const AppError = require('./shared/utils/appError');
const globalErrorHandler = require('./shared/middlewares/globalErrorHandler');
const routes = require('./routes');

const app = express();

app.disable('x-powered-by');

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || [];
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // Allow all origins in development
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'X-Auth-Token'
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

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'WorkConnect API is healthy',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', routes);

app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});


app.use(globalErrorHandler);

module.exports = app;
