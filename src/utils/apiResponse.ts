import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export class ApiResponseHandler {
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200,
    meta?: any
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      ...(meta && { meta })
    };

    res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string = 'Error',
    statusCode: number = 500,
    code?: string,
    details?: any
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      code,
      ...(details && { data: details })
    };

    res.status(statusCode).json(response);
  }

  static created<T>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully'
  ): void {
    this.success(res, data, message, 201);
  }

  static notFound(
    res: Response,
    message: string = 'Resource not found',
    code: string = 'RESOURCE_NOT_FOUND'
  ): void {
    this.error(res, message, 404, code);
  }

  static unauthorized(
    res: Response,
    message: string = 'Unauthorized access',
    code: string = 'UNAUTHORIZED'
  ): void {
    this.error(res, message, 401, code);
  }

  static forbidden(
    res: Response,
    message: string = 'Forbidden access',
    code: string = 'FORBIDDEN'
  ): void {
    this.error(res, message, 403, code);
  }

  static badRequest(
    res: Response,
    message: string = 'Bad request',
    code: string = 'BAD_REQUEST',
    details?: any
  ): void {
    this.error(res, message, 400, code, details);
  }

  static conflict(
    res: Response,
    message: string = 'Resource conflict',
    code: string = 'CONFLICT'
  ): void {
    this.error(res, message, 409, code);
  }

  static validationError(
    res: Response,
    message: string = 'Validation failed',
    details?: any
  ): void {
    this.error(res, message, 400, 'VALIDATION_ERROR', details);
  }

  static rateLimitExceeded(
    res: Response,
    message: string = 'Too many requests',
    retryAfter?: number
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      code: 'RATE_LIMIT_EXCEEDED',
      ...(retryAfter && { data: { retryAfter } })
    };

    res.status(429).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Success'
  ): void {
    const totalPages = Math.ceil(total / limit);
    
    this.success(res, data, message, 200, {
      page,
      limit,
      total,
      totalPages
    });
  }
}
