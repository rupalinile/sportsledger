import { ErrorRequestHandler } from 'express';
import { env } from '../config/env';
import { HTTP_STATUS } from '../constants/http-status';
import { AppError } from '../utils/AppError';

export const globalErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode =
    error instanceof AppError ? error.statusCode : HTTP_STATUS.INTERNAL_SERVER_ERROR;

  const message =
    error instanceof AppError ? error.message : 'Something went wrong';

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV !== 'production' ? { stack: error.stack } : {})
  });
};
