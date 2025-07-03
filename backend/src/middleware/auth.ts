import { Request, Response, NextFunction } from 'express';
const jwt = require('jsonwebtoken');
import { config } from '../config/environment';
import { db } from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    preferences?: any;
  };
}

interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    } catch (jwtError) {
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
    const user = await db.getUserById(decoded.userId);
    if (!user) {
      res.status(401).json({
        error: 'User not found',
        message: 'The user associated with this token no longer exists.',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Update user's last active timestamp
    await db.updateUserLastActive(user.id);

    // Attach user info to request object
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      preferences: user.preferences
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication',
      code: 'AUTH_ERROR'
    });
  }
};

// Optional middleware for routes that work with or without authentication
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
      const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
      const user = await db.getUserById(decoded.userId);
      
      if (user) {
        await db.updateUserLastActive(user.id);
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          preferences: user.preferences
        };
      }
    } catch {
      // Invalid token, continue without user (don't throw error)
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Even if there's an error, continue without user
    next();
  }
};

// Utility function to generate JWT token
export const generateToken = (user: { id: string; username: string; email: string }): string => {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      email: user.email
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
      issuer: 'ai-developer-tutor',
      audience: 'ai-developer-tutor-users'
    }
  );
};

// Utility function to generate refresh token
export const generateRefreshToken = (user: { id: string }): string => {
  return jwt.sign(
    { userId: user.id },
    config.jwtRefreshSecret,
    {
      expiresIn: config.jwtRefreshExpiresIn,
      issuer: 'ai-developer-tutor',
      audience: 'ai-developer-tutor-refresh'
    }
  );
};

// Utility function to verify refresh token
export const verifyRefreshToken = (token: string): { userId: string } | null => {
  try {
    const decoded = jwt.verify(token, config.jwtRefreshSecret) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
};

export default authMiddleware; 