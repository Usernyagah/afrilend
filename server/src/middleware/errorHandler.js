const logger = require('../utils/logger');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Hedera SDK errors
  if (err.name === 'HederaError') {
    const message = 'Blockchain operation failed';
    error = { message, statusCode: 500 };
  }

  // Firestore errors
  if (err.code === 'permission-denied') {
    const message = 'Permission denied';
    error = { message, statusCode: 403 };
  }

  if (err.code === 'not-found') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Rate limit errors
  if (err.statusCode === 429) {
    const message = 'Too many requests';
    error = { message, statusCode: 429 };
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Don't leak error details in production
  const response = {
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Add request ID if available
  if (req.id) {
    response.requestId = req.id;
  }

  res.status(statusCode).json(response);
};

/**
 * Async error handler wrapper
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for undefined routes
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Validation error handler
 */
const validationErrorHandler = (errors) => {
  return (req, res, next) => {
    if (errors && errors.length > 0) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.details = errors;
      return next(error);
    }
    next();
  };
};

/**
 * Custom error class
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (err, promise) => {
    logger.error('Unhandled Promise Rejection:', err);
    // Close server & exit process
    process.exit(1);
  });
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    // Close server & exit process
    process.exit(1);
  });
};

/**
 * Handle SIGTERM signal
 */
const handleSIGTERM = () => {
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });
};

/**
 * Handle SIGINT signal
 */
const handleSIGINT = () => {
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
};

/**
 * Initialize all error handlers
 */
const initializeErrorHandlers = () => {
  handleUnhandledRejection();
  handleUncaughtException();
  handleSIGTERM();
  handleSIGINT();
};

/**
 * Error response formatter
 */
const formatErrorResponse = (error, req) => {
  const response = {
    error: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add additional details in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.details = error.details;
  }

  // Add request ID if available
  if (req.id) {
    response.requestId = req.id;
  }

  return response;
};

/**
 * Success response formatter
 */
const formatSuccessResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFound,
  validationErrorHandler,
  AppError,
  initializeErrorHandlers,
  formatErrorResponse,
  formatSuccessResponse
};
