import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

// Custom error classes
export class ValidationError extends Error {
  public statusCode = 400;
  public code = 'VALIDATION_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  public statusCode = 401;
  public code = 'AUTHENTICATION_ERROR';
  
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  public statusCode = 403;
  public code = 'AUTHORIZATION_ERROR';
  
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  public statusCode = 404;
  public code = 'NOT_FOUND';
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  public statusCode = 429;
  public code = 'RATE_LIMIT_EXCEEDED';
  
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends Error {
  public statusCode = 500;
  public code = 'DATABASE_ERROR';
  
  constructor(message: string = 'Database operation failed', public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class OpenAIError extends Error {
  public statusCode = 503;
  public code = 'OPENAI_ERROR';
  
  constructor(message: string = 'OpenAI service error', public details?: any) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export class LangGraphError extends Error {
  public statusCode = 500;
  public code = 'LANGGRAPH_ERROR';
  
  constructor(message: string = 'LangGraph execution error', public details?: any) {
    super(message);
    this.name = 'LangGraphError';
  }
}

// Error logging function
const logError = (error: APIError, req: Request): void => {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
    errorName: error.name,
    errorMessage: error.message,
    statusCode: error.statusCode,
    code: error.code,
    stack: error.stack,
    details: error.details
  };

  // Log based on severity
  if (error.statusCode && error.statusCode >= 500) {
    console.error('🚨 Server Error:', JSON.stringify(logData, null, 2));
  } else if (error.statusCode && error.statusCode >= 400) {
    console.warn('⚠️ Client Error:', JSON.stringify(logData, null, 2));
  } else {
    console.log('ℹ️ Info:', JSON.stringify(logData, null, 2));
  }
};

// Determine if error details should be exposed to client
const shouldExposeDetails = (error: APIError): boolean => {
  if (config.nodeEnv === 'development') {
    return true;
  }
  
  // Only expose details for client errors (4xx), not server errors (5xx)
  return error.statusCode ? error.statusCode < 500 : false;
};

// Main error handling middleware
export const errorHandler = (
  error: APIError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logError(error, req);

  // Determine status code
  const statusCode = error.statusCode || 500;
  
  // Determine error code
  const errorCode = error.code || 'INTERNAL_SERVER_ERROR';
  
  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: {
      code: errorCode,
      message: error.message || 'An unexpected error occurred'
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // Add request ID if available
  if (req.headers['x-request-id']) {
    errorResponse.requestId = req.headers['x-request-id'];
  }

  // Add error details in development or for client errors
  if (shouldExposeDetails(error)) {
    if (error.details) {
      errorResponse.error.details = error.details;
    }
    
    if (config.nodeEnv === 'development' && error.stack) {
      errorResponse.error.stack = error.stack;
    }
  }

  // Add helpful hints for common errors
  switch (errorCode) {
    case 'AUTHENTICATION_ERROR':
    case 'TOKEN_EXPIRED':
    case 'TOKEN_INVALID':
      errorResponse.error.hint = 'Please log in again to continue';
      break;
    case 'AUTHORIZATION_ERROR':
      errorResponse.error.hint = 'You do not have permission to access this resource';
      break;
    case 'RATE_LIMIT_EXCEEDED':
      errorResponse.error.hint = 'Please wait before making another request';
      errorResponse.error.retryAfter = 60; // seconds
      break;
    case 'VALIDATION_ERROR':
      errorResponse.error.hint = 'Please check your input and try again';
      break;
    case 'NOT_FOUND':
      errorResponse.error.hint = 'The requested resource could not be found';
      break;
  }

  // Handle specific error types
  if (error.name === 'CastError') {
    errorResponse.error.code = 'INVALID_ID';
    errorResponse.error.message = 'Invalid resource ID provided';
  }

  if (error.name === 'ValidationError') {
    errorResponse.error.code = 'VALIDATION_ERROR';
    // For mongoose validation errors, extract field errors
    if (error.details && typeof error.details === 'object') {
      const fieldErrors: any = {};
      Object.keys(error.details).forEach(key => {
        fieldErrors[key] = error.details[key].message;
      });
      errorResponse.error.fields = fieldErrors;
    }
  }

  // Set security headers for error responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Async error wrapper - wraps async route handlers to catch errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for unknown routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('🚨 Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // In production, you might want to gracefully shutdown here
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('🚨 Uncaught Exception:', error);
  // In production, you should gracefully shutdown here
  process.exit(1);
});

export default errorHandler; 