"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.LangGraphError = exports.OpenAIError = exports.DatabaseError = exports.RateLimitError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = void 0;
const environment_1 = require("../config/environment");
// Custom error classes
class ValidationError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.statusCode = 400;
        this.code = 'VALIDATION_ERROR';
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends Error {
    constructor(message = 'Authentication required') {
        super(message);
        this.statusCode = 401;
        this.code = 'AUTHENTICATION_ERROR';
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends Error {
    constructor(message = 'Insufficient permissions') {
        super(message);
        this.statusCode = 403;
        this.code = 'AUTHORIZATION_ERROR';
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends Error {
    constructor(message = 'Resource not found') {
        super(message);
        this.statusCode = 404;
        this.code = 'NOT_FOUND';
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class RateLimitError extends Error {
    constructor(message = 'Rate limit exceeded') {
        super(message);
        this.statusCode = 429;
        this.code = 'RATE_LIMIT_EXCEEDED';
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
class DatabaseError extends Error {
    constructor(message = 'Database operation failed', details) {
        super(message);
        this.details = details;
        this.statusCode = 500;
        this.code = 'DATABASE_ERROR';
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
class OpenAIError extends Error {
    constructor(message = 'OpenAI service error', details) {
        super(message);
        this.details = details;
        this.statusCode = 503;
        this.code = 'OPENAI_ERROR';
        this.name = 'OpenAIError';
    }
}
exports.OpenAIError = OpenAIError;
class LangGraphError extends Error {
    constructor(message = 'LangGraph execution error', details) {
        super(message);
        this.details = details;
        this.statusCode = 500;
        this.code = 'LANGGRAPH_ERROR';
        this.name = 'LangGraphError';
    }
}
exports.LangGraphError = LangGraphError;
// Error logging function
const logError = (error, req) => {
    const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id,
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
    }
    else if (error.statusCode && error.statusCode >= 400) {
        console.warn('⚠️ Client Error:', JSON.stringify(logData, null, 2));
    }
    else {
        console.log('ℹ️ Info:', JSON.stringify(logData, null, 2));
    }
};
// Determine if error details should be exposed to client
const shouldExposeDetails = (error) => {
    if (environment_1.config.nodeEnv === 'development') {
        return true;
    }
    // Only expose details for client errors (4xx), not server errors (5xx)
    return error.statusCode ? error.statusCode < 500 : false;
};
// Main error handling middleware
const errorHandler = (error, req, res, next) => {
    // Log the error
    logError(error, req);
    // Determine status code
    const statusCode = error.statusCode || 500;
    // Determine error code
    const errorCode = error.code || 'INTERNAL_SERVER_ERROR';
    // Prepare error response
    const errorResponse = {
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
        if (environment_1.config.nodeEnv === 'development' && error.stack) {
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
            const fieldErrors = {};
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
exports.errorHandler = errorHandler;
// Async error wrapper - wraps async route handlers to catch errors
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// 404 handler for unknown routes
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Promise Rejection at:', promise, 'reason:', reason);
    // In production, you might want to gracefully shutdown here
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    // In production, you should gracefully shutdown here
    process.exit(1);
});
exports.default = exports.errorHandler;
