/**
 * Centralized error handling middleware for consistent API error responses
 */

const logger = require('../utils/logger');
const { BaseError } = require('../utils/errors');

// Error response formatter
const formatErrorResponse = (error, req) => {
  const baseResponse = {
    success: false,
    error: {
      code: error.errorCode || 'INTERNAL_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    }
  };

  // Add request ID if available
  if (req.id || req.requestId) {
    baseResponse.error.requestId = req.id || req.requestId;
  }

  // Add validation details for validation errors
  if (error.details && Array.isArray(error.details)) {
    baseResponse.error.details = error.details;
  }

  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    baseResponse.error.stack = error.stack;
  }

  return baseResponse;
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Handle known error types
  if (err instanceof BaseError) {
    const errorResponse = formatErrorResponse(err, req);
    return res.status(err.statusCode).json(errorResponse);
  }

  // Handle MySQL/Sequelize database errors
  if (err.name === 'SequelizeValidationError') {
    const validationError = {
      errorCode: 'VALIDATION_ERROR',
      message: 'Database validation failed',
      statusCode: 400,
      details: err.errors.map(error => ({
        field: error.path,
        message: error.message,
        value: error.value
      }))
    };
    const errorResponse = formatErrorResponse(validationError, req);
    return res.status(400).json(errorResponse);
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const constraintError = {
      errorCode: 'CONSTRAINT_ERROR',
      message: 'Foreign key constraint violation',
      statusCode: 400
    };
    const errorResponse = formatErrorResponse(constraintError, req);
    return res.status(400).json(errorResponse);
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const uniqueError = {
      errorCode: 'DUPLICATE_ENTRY',
      message: 'Duplicate entry error',
      statusCode: 409,
      details: err.errors.map(error => ({
        field: error.path,
        message: error.message,
        value: error.value
      }))
    };
    const errorResponse = formatErrorResponse(uniqueError, req);
    return res.status(409).json(errorResponse);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    const jwtError = {
      errorCode: 'INVALID_TOKEN',
      message: 'Invalid JWT token',
      statusCode: 401
    };
    const errorResponse = formatErrorResponse(jwtError, req);
    return res.status(401).json(errorResponse);
  }

  if (err.name === 'TokenExpiredError') {
    const expiredError = {
      errorCode: 'TOKEN_EXPIRED',
      message: 'JWT token has expired',
      statusCode: 401
    };
    const errorResponse = formatErrorResponse(expiredError, req);
    return res.status(401).json(errorResponse);
  }

  // Handle multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    const fileSizeError = {
      errorCode: 'FILE_TOO_LARGE',
      message: 'File size exceeds the limit',
      statusCode: 413
    };
    const errorResponse = formatErrorResponse(fileSizeError, req);
    return res.status(413).json(errorResponse);
  }

  // Handle syntax errors (malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const syntaxError = {
      errorCode: 'MALFORMED_JSON',
      message: 'Invalid JSON format',
      statusCode: 400
    };
    const errorResponse = formatErrorResponse(syntaxError, req);
    return res.status(400).json(errorResponse);
  }

  // Handle rate limiting errors
  if (err.status === 429) {
    const rateLimitError = {
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
      statusCode: 429
    };
    const errorResponse = formatErrorResponse(rateLimitError, req);
    return res.status(429).json(errorResponse);
  }

  // Default internal server error
  const internalError = {
    errorCode: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred'
      : err.message,
    statusCode: 500
  };

  const errorResponse = formatErrorResponse(internalError, req);
  return res.status(500).json(errorResponse);
};

// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
  const notFoundError = {
    errorCode: 'ENDPOINT_NOT_FOUND',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    statusCode: 404
  };

  const errorResponse = formatErrorResponse(notFoundError, req);
  return res.status(404).json(errorResponse);
};

// Success response formatter
const successResponse = (res, data, message = 'Operation successful', statusCode = 200) => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };

  return res.status(statusCode).json(response);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  successResponse,
  formatErrorResponse
};