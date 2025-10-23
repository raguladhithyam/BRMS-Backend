import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { getRedisClient } from '../config/redis';

// Custom rate limit store using Redis
const createRedisStore = () => {
  const redisClient = getRedisClient();
  
  if (!redisClient) {
    return undefined; // Fall back to memory store
  }

  return {
    async increment(key: string, windowMs: number) {
      const pipeline = redisClient.pipeline();
      const now = Date.now();
      const window = Math.floor(now / windowMs);
      const redisKey = `rate_limit:${key}:${window}`;
      
      const pipelineResult = pipeline.incr(redisKey).expire(redisKey, Math.ceil(windowMs / 1000));
      const results = await pipeline.exec();
      
      if (!results || results[0][1] === null) {
        return { totalHits: 1, resetTime: new Date(now + windowMs) };
      }
      
      const totalHits = results[0][1] as number;
      return { totalHits, resetTime: new Date(now + windowMs) };
    },
    
    async decrement(key: string) {
      // Not implemented for this use case
    },
    
    async resetKey(key: string) {
      const pattern = `rate_limit:${key}:*`;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    }
  };
};

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req: Request) => {
    // Use IP + User ID if available for more granular limiting
    const userId = (req as any).user?.id;
    return userId ? `${req.ip}:${userId}` : req.ip;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(15 * 60) // 15 minutes in seconds
    });
  }
});

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req: Request) => {
    // Use email if available for login attempts
    const email = req.body?.email;
    return email ? `${req.ip}:${email}` : req.ip;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(15 * 60) // 15 minutes in seconds
    });
  }
});

// Blood request rate limiter
export const bloodRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 blood requests per hour
  message: {
    success: false,
    message: 'Too many blood requests, please try again later.',
    code: 'BLOOD_REQUEST_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req: Request) => {
    // Use email for blood request limiting
    const email = req.body?.email;
    return email ? `blood_request:${req.ip}:${email}` : `blood_request:${req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many blood requests, please try again later.',
      code: 'BLOOD_REQUEST_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(60 * 60) // 1 hour in seconds
    });
  }
});

// Admin operations rate limiter
export const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit admin operations
  message: {
    success: false,
    message: 'Too many admin operations, please slow down.',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return userId ? `admin:${userId}` : `admin:${req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many admin operations, please slow down.',
      code: 'ADMIN_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(5 * 60) // 5 minutes in seconds
    });
  }
});

// File upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit file uploads
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return userId ? `upload:${userId}` : `upload:${req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many file uploads, please try again later.',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(60 * 60) // 1 hour in seconds
    });
  }
});
