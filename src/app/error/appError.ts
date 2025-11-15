import envConfig from '../config';
import {
  AppErrorParams,
  ErrorCategory,
  ErrorDetails,
  HttpStatusCode,
} from '../types/error';

export class appError extends Error {
  public readonly category: ErrorCategory | undefined;
  public readonly status: string;
  public readonly statusCode: HttpStatusCode;
  public readonly details: ErrorDetails;
  public readonly originalError?: Error | undefined;
  public readonly isOperational: boolean;
  public readonly code?: string | undefined;
  public readonly timestamp: Date;

  constructor(params: AppErrorParams) {
    const {
      message,
      category,
      statusCode = 500,
      details = {},
      originalError,
      isOperational = true,
      code,
    } = params;

    super(message);

    Object.setPrototypeOf(this, new.target.prototype);

    this.status = 'False';
    this.category = category;
    this.details = details;
    this.statusCode = statusCode;
    this.details = details;
    this.originalError = originalError;
    this.isOperational = isOperational;
    this.code = code;
    this.timestamp = new Date();

    if (
      Error.captureStackTrace !== undefined &&
      Error.captureStackTrace !== null
    ) {
      Error.captureStackTrace(this, this.constructor);
    }

    if (originalError?.stack != null) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }

  public toJSON(): Record<string, unknown> {
    return {
      status: this.status,
      message: this.message,
      category: this.category,
      statusCode: this.statusCode,
      code: this.code,
      isOperational: this.isOperational,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
      stack: this.stack,
      ...(this.originalError && {
        originalError: {
          message: this.originalError.message,
          stack: this.originalError.stack,
        },
      }),
    };
  }

  public toResponse(): Record<string, unknown> {
    const response: Record<string, unknown> = {
      error: {
        status: this.status,
        message: this.message,
        category: this.category,
        code: this.code,
      },
    };

    if (
      envConfig.NODE_ENV === 'development' ||
      this.category === 'VALIDATION'
    ) {
      (response['error'] as Record<string, unknown>)['details'] = this.details;
    }

    return response;
  }

  public get isOperationalError(): boolean {
    return this.isOperational;
  }

  public static validation(
    message: string,
    details?: ErrorDetails,
    originalError?: Error
  ): appError {
    return new appError({
      message,
      category: 'VALIDATION',
      statusCode: 400,
      details,
      originalError,
      code: 'VALIDATION_ERROR',
    });
  }

  public static authentication(
    message: string = 'Authentication required',
    details?: ErrorDetails,
    originalError?: Error
  ): appError {
    return new appError({
      message,
      category: 'AUTHENTICATION',
      statusCode: 401,
      details,
      originalError,
      code: 'AUTHENTICATION_ERROR',
    });
  }

  public static authorization(
    message: string = 'Insufficient permissions',
    details?: ErrorDetails,
    originalError?: Error
  ): appError {
    return new appError({
      message,
      category: 'AUTHORIZATION',
      statusCode: 403,
      details,
      originalError,
      code: 'AUTHORIZATION_ERROR',
    });
  }

  public static notFound(
    resource: string,
    details?: ErrorDetails,
    originalError?: Error
  ): appError {
    return new appError({
      message: `${resource} not found`,
      category: 'NOT_FOUND',
      statusCode: 404,
      details,
      originalError,
      code: 'RESOURCE_NOT_FOUND',
    });
  }

  public static database(
    message: string,
    details?: ErrorDetails,
    originalError?: Error
  ): appError {
    return new appError({
      message,
      category: 'DATABASE',
      statusCode: 500,
      details,
      originalError,
      code: 'DATABASE_ERROR',
    });
  }

  public static conflict(
    message: string,
    details?: ErrorDetails,
    originalError?: Error
  ): appError {
    return new appError({
      message,
      category: 'BUSINESS_LOGIC',
      statusCode: 409,
      details,
      originalError,
      code: 'CONFLICT_ERROR',
    });
  }

  public static rateLimit(
    message: string = 'Too many requests',
    details?: ErrorDetails,
    originalError?: Error
  ): appError {
    return new appError({
      message,
      category: 'RATE_LIMITING',
      statusCode: 429,
      details,
      originalError,
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  public static internal(
    message: string = 'Internal server error',
    details?: ErrorDetails,
    originalError?: Error
  ): appError {
    return new appError({
      message,
      category: 'INTERNAL_SERVER',
      statusCode: 500,
      details,
      originalError,
      code: 'INTERNAL_SERVER_ERROR',
    });
  }

  public static isAppError(error: unknown): error is appError {
    return error instanceof appError;
  }

  public static fromUnknown(error: unknown, details?: ErrorDetails): appError {
    if (appError.isAppError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return new appError({
        message: error.message,
        category: 'UNKNOWN',
        statusCode: 500,
        details,
        originalError: error,
        isOperational: false,
        code: 'UNKNOWN_ERROR',
      });
    }

    return new appError({
      message: 'An unknown error occurred',
      category: 'UNKNOWN',
      statusCode: 500,
      details,
      isOperational: false,
      code: 'UNKNOWN_ERROR',
    });
  }
}

export const isAppError = (error: unknown): error is appError => {
  return error instanceof appError;
};

export default appError;
