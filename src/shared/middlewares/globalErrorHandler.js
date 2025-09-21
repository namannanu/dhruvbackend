const AppError = require('../utils/appError');

module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  if (!(err instanceof AppError)) {
    console.error('Unexpected error:', err);
  }

  res.status(statusCode).json({
    status,
    message: err.message || 'Something went wrong',
    errors: err.errors || undefined
  });
};
