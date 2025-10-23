import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiResponseHandler } from '../utils/apiResponse';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      ApiResponseHandler.validationError(res, 'Validation failed', details);
      return;
    }
    
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.query, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      ApiResponseHandler.validationError(res, 'Query validation failed', details);
      return;
    }
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.params, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      ApiResponseHandler.validationError(res, 'Parameter validation failed', details);
      return;
    }
    next();
  };
};

// Common validation schemas
export const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6), // Make password optional
    role: Joi.string().valid('student').default('student'),
    bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').required(),
    rollNo: Joi.string().required(),
    phone: Joi.string().min(10).max(15).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  bloodRequest: Joi.object({
    requestorName: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().min(10).max(15).required(),
    bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').required(),
    units: Joi.number().integer().min(1).max(10).required(),
    dateTime: Joi.date().greater('now').required(),
    hospitalName: Joi.string().min(2).max(200).required(),
    location: Joi.string().min(5).max(500).required(),
    urgency: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    notes: Joi.string().max(1000).optional().allow(''),
  }),

  createStudent: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').required(),
    rollNo: Joi.string().required(),
    phone: Joi.string().min(10).max(15).required(),
    availability: Joi.boolean().default(true),
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().min(10).max(15).optional(),
    bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
    rollNo: Joi.string().optional(),
  }),
};