import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ValidationError } from 'joi';

interface CustomError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: any;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error to system logs
  let user = 'system';
  let role = 'admin'; // default to admin for system logs
  if ((req as any).user) {
    const u = (req as any).user;
    const firstName = u.firstName || u.name || u.email || 'system';
    role = u.role || '';
    user = `${firstName} - ${role}`;
  } else {
    user = `system - ${role}`;
  }
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, { user, role });

  // Joi validation errors
  if (err instanceof ValidationError) {
    const message = 'Validation failed';
    error = { name: 'ValidationError', message, statusCode: 400, code: 'VALIDATION_ERROR' };
  }

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const message = 'Database validation failed';
    error = { name: 'SequelizeValidationError', message, statusCode: 400, code: 'DB_VALIDATION_ERROR' };
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = 'Resource already exists';
    error = { name: 'SequelizeUniqueConstraintError', message, statusCode: 409, code: 'DUPLICATE_RESOURCE' };
  }

  // Sequelize foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const message = 'Invalid reference to related resource';
    error = { name: 'SequelizeForeignKeyConstraintError', message, statusCode: 400, code: 'FOREIGN_KEY_ERROR' };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { name: 'JsonWebTokenError', message, statusCode: 401, code: 'INVALID_TOKEN' };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { name: 'TokenExpiredError', message, statusCode: 401, code: 'TOKEN_EXPIRED' };
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    const message = 'Too many requests. Please try again later.';
    error = { name: 'RateLimitError', message, statusCode: 429, code: 'RATE_LIMIT_EXCEEDED' };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = { name: 'FileSizeError', message, statusCode: 413, code: 'FILE_TOO_LARGE' };
  }

  // Cast error (bad ObjectId)
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { name: 'CastError', message, statusCode: 404, code: 'RESOURCE_NOT_FOUND' };
  }

  // Duplicate key error
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    const message = 'Duplicate field value entered';
    error = { name: 'DuplicateError', message, statusCode: 400, code: 'DUPLICATE_FIELD' };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    code: error.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: error.details 
    }),
  });
};