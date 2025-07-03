"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.generateRefreshToken = exports.generateToken = exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const jwt = require('jsonwebtoken');
const environment_1 = require("../config/environment");
const database_1 = require("../config/database");
const authMiddleware = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({
                error: 'Authentication required',
                message: 'No authorization header provided'
            });
            return;
        }
        // Check for Bearer token format
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;
        if (!token) {
            res.status(401).json({
                error: 'Authentication required',
                message: 'No token provided'
            });
            return;
        }
        // Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, environment_1.config.jwtSecret);
        }
        catch (jwtError) {
            if (jwtError instanceof jwt.TokenExpiredError) {
                res.status(401).json({
                    error: 'Token expired',
                    message: 'Your session has expired. Please log in again.',
                    code: 'TOKEN_EXPIRED'
                });
                return;
            }
            if (jwtError instanceof jwt.JsonWebTokenError) {
                res.status(401).json({
                    error: 'Invalid token',
                    message: 'The provided token is invalid.',
                    code: 'TOKEN_INVALID'
                });
                return;
            }
            throw jwtError;
        }
        // Fetch user from database to ensure they still exist
        const user = await database_1.db.getUserById(decoded.userId);
        if (!user) {
            res.status(401).json({
                error: 'User not found',
                message: 'The user associated with this token no longer exists.',
                code: 'USER_NOT_FOUND'
            });
            return;
        }
        // Update user's last active timestamp
        await database_1.db.updateUserLastActive(user.id);
        // Attach user info to request object
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            preferences: user.preferences
        };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            error: 'Authentication error',
            message: 'An error occurred during authentication',
            code: 'AUTH_ERROR'
        });
    }
};
exports.authMiddleware = authMiddleware;
// Optional middleware for routes that work with or without authentication
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            // No auth header, continue without user
            next();
            return;
        }
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;
        if (!token) {
            // No token, continue without user
            next();
            return;
        }
        try {
            const decoded = jwt.verify(token, environment_1.config.jwtSecret);
            const user = await database_1.db.getUserById(decoded.userId);
            if (user) {
                await database_1.db.updateUserLastActive(user.id);
                req.user = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    preferences: user.preferences
                };
            }
        }
        catch {
            // Invalid token, continue without user (don't throw error)
        }
        next();
    }
    catch (error) {
        console.error('Optional auth middleware error:', error);
        // Even if there's an error, continue without user
        next();
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
// Utility function to generate JWT token
const generateToken = (user) => {
    return jwt.sign({
        userId: user.id,
        username: user.username,
        email: user.email
    }, environment_1.config.jwtSecret, {
        expiresIn: environment_1.config.jwtExpiresIn,
        issuer: 'ai-developer-tutor',
        audience: 'ai-developer-tutor-users'
    });
};
exports.generateToken = generateToken;
// Utility function to generate refresh token
const generateRefreshToken = (user) => {
    return jwt.sign({ userId: user.id }, environment_1.config.jwtRefreshSecret, {
        expiresIn: environment_1.config.jwtRefreshExpiresIn,
        issuer: 'ai-developer-tutor',
        audience: 'ai-developer-tutor-refresh'
    });
};
exports.generateRefreshToken = generateRefreshToken;
// Utility function to verify refresh token
const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, environment_1.config.jwtRefreshSecret);
        return decoded;
    }
    catch {
        return null;
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
exports.default = exports.authMiddleware;
