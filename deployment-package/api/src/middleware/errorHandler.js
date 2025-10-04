const logger = require('../utils/logger');

// Custom error class for application errors
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

// Database error handler
const handleDBError = (err) => {
  logger.error('Database error:', err);
  
  if (err.code === 'ER_DUP_ENTRY') {
    const duplicateField = err.message.match(/for key '(.+)'/)?.[1] || 'field';
    return new AppError(`Duplicate entry for ${duplicateField}`, 409);
  }
  
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return new AppError('Referenced record does not exist', 400);
  }
  
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return new AppError('Cannot delete record as it is referenced by other records', 400);
  }
  
  if (err.code === 'ER_BAD_FIELD_ERROR') {
    return new AppError('Invalid field in query', 400);
  }
  
  return new AppError('Database operation failed', 500);
};

// JWT error handler
const handleJWTError = (err) => {
  if (err.name === 'JsonWebTokenError') {
    return new AppError('Invalid token', 401);
  }
  
  if (err.name === 'TokenExpiredError') {
    return new AppError('Token expired', 401);
  }
  
  return new AppError('Authentication failed', 401);
};

// Validation error handler
const handleValidationError = (err) => {
  const errors = err.array ? err.array() : err.errors || [];
  const errorMessages = errors.map(error => ({
    field: error.path || error.param,
    message: error.msg || error.message,
  }));

  return {
    statusCode: 400,
    message: 'Validation failed',
    errors: errorMessages,
  };
};

// Send error response in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// Send error response in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err);
    
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong!',
    });
  }
};

// Main error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  logger.error(`Error on ${req.method} ${req.path}:`, {
    message: err.message,
    stack: err.stack,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user?.id,
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (err.code?.startsWith('ER_')) {
      error = handleDBError(err);
    }
    
    if (err.name?.includes('JsonWebToken') || err.name?.includes('TokenExpired')) {
      error = handleJWTError(err);
    }
    
    if (err.errors && Array.isArray(err.errors)) {
      const validationError = handleValidationError(err);
      return res.status(validationError.statusCode).json({
        success: false,
        message: validationError.message,
        errors: validationError.errors,
      });
    }

    sendErrorProd(error, res);
  }
};

// Catch async errors wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Handle unhandled routes
const handleNotFound = (req, res, next) => {
  const err = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(err);
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  handleNotFound,
};