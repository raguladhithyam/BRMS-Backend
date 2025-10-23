import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { getRedisClient } from '../config/redis';

interface AuthRequest extends Request {
  user?: User;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Check Redis session for additional security
    const redisClient = getRedisClient();
    if (redisClient) {
      const sessionToken = await redisClient.get(`session:${decoded.id}`);
      if (!sessionToken || sessionToken !== token) {
        res.status(401).json({
          success: false,
          message: 'Session expired. Please login again.',
          code: 'SESSION_EXPIRED'
        });
        return;
      }
    }

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Check if user account is valid (no additional checks needed for now)
    // Future: Add account status checks here if needed

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token format.',
        code: 'INVALID_TOKEN'
      });
    } else {
      console.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication service error.',
        code: 'AUTH_ERROR'
      });
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Access denied. User not authenticated.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
      return;
    }

    next();
  };
};