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
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    const allowed = (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (!allowed.length || allowed.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
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
