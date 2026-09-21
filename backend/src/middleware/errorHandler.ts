import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ApiErrorResponse } from '../types';

/**
 * Centralized Express error-handling middleware.
 * Formats all errors into standard { error: { code, message, ... } } response.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response<ApiErrorResponse>,
  next: NextFunction
): void => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err instanceof AppError ? err.statusCode : (err.status || 500);
  const code = err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const isProd = process.env.NODE_ENV === 'production';
  const message = (statusCode >= 500 && isProd && !(err instanceof AppError))
    ? 'An internal server error occurred.'
    : (err.message || 'An unexpected error occurred');

  // Log 500 errors to console
  if (statusCode >= 500) {
    console.error(`[ErrorHandler] ${req.method} ${req.originalUrl} - 500 Internal Server Error:`, err);
  }

  const responseBody: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {}),
      ...(err.jobId ? { jobId: err.jobId } : {}),
    },
  };

  res.status(statusCode).json(responseBody);
};
