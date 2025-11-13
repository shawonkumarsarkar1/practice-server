/* eslint-disable @typescript-eslint/no-unused-vars */
import { ErrorRequestHandler } from 'express';
import { appError } from '../error/appError'; // Adjust import path as needed
import {
  formatMongoCastError,
  formatMongoDuplicateKeyError,
  formatMongoValidationError,
  isJWTError,
  isMongoError,
} from '../utils/errors';
import sendErrorResponse from '../response/sendErrorResponse';

const globalErrorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (
    isMongoError(error) &&
    (error.code === 11000 ||
      (error.name === 'MongoError' && error.code === 11000))
  ) {
    const mongoError = formatMongoDuplicateKeyError(error);
    const unknownAppError = appError.fromUnknown(mongoError, {
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
    return sendErrorResponse(unknownAppError, req, res);
  }

  // Handle MongoDB CastError (invalid ObjectId)
  if (isMongoError(error) && error?.name === 'CastError') {
    const castError = formatMongoCastError(error);
    const unknownAppError = appError.fromUnknown(castError, {
      path: req.path,
      method: req.method,
      resource: error.model?.modelName ?? 'Unknown',
      timestamp: new Date().toISOString(),
    });
    return sendErrorResponse(unknownAppError, req, res);
  }

  // Handle MongoDB ValidationError
  if (isMongoError(error) && error?.name === 'ValidationError') {
    const validationError = formatMongoValidationError(error);
    const unknownAppError = appError.fromUnknown(validationError, {
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
    return sendErrorResponse(unknownAppError, req, res);
  }
  // Handle JWT errors
  if (isJWTError(error) && error?.name === 'JsonWebTokenError') {
    const unknownAppError = appError.authentication(
      'Invalid token',
      {
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      },
      error
    );
    return sendErrorResponse(unknownAppError, req, res);
  }

  if (isJWTError(error) && error?.name === 'TokenExpiredError') {
    const unknownAppError = appError.authentication(
      'Token expired',
      {
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      },
      error
    );
    return sendErrorResponse(unknownAppError, req, res);
  }

  // Handle SyntaxError (JSON parsing errors)
  if (error instanceof SyntaxError && 'body' in error) {
    const unknownAppError = appError.validation(
      'Invalid JSON in request body',
      {
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      },
      error
    );
    return sendErrorResponse(unknownAppError, req, res);
  }

  // Handle AppError instances
  if (appError.isAppError(error)) {
    return sendErrorResponse(error, req, res);
  }

  // Handle all other unknown errors
  const unknownOtherError = appError.fromUnknown(error, {
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  return sendErrorResponse(unknownOtherError, req, res);
};

export default globalErrorHandler;
