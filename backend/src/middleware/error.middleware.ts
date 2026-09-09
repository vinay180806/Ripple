import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../types/api.types';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    logger.warn('Validation error', {
      path: req.path,
      method: req.method,
      errors: formattedErrors,
    });

    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: formattedErrors,
      },
    });
    return;
  }

  // Handle Known Application Errors
  if (err instanceof AppError) {
    logger.warn(`Application error: ${err.message}`, {
      path: req.path,
      method: req.method,
      statusCode: err.statusCode,
      errorCode: err.errorCode,
    });

    res.status(err.statusCode).json({
      status: 'error',
      error: {
        code: err.errorCode,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Handle Uncaught / Internal Errors
  logger.error(`Unhandled internal error: ${err.message}`, {
    path: req.path,
    method: req.method,
  }, err);

  res.status(500).json({
    status: 'error',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`,
    },
  });
}
