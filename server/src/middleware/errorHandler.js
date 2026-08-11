const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message = 'Internal server error' } = err;
  let details = err.details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  }

  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account or record with this ${field} already exists.`;
  }

  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details !== undefined && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
