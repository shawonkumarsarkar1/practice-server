import {
  AppErrorParams,
  ErrorCategory,
  ErrorContext,
  ErrorSeverity,
  HttpStatusCode,
} from '../types/error';

/**
 * Custom application error class that extends the native Error class
 * Provides structured error handling with categorization, severity levels,
 * and additional context for better error management and debugging
 */
export class appError extends Error {
  // Error categorization (e.g., VALIDATION, AUTHENTICATION, DATABASE)
  public readonly category: ErrorCategory | undefined;

  // Severity level (LOW, MEDIUM, HIGH, CRITICAL) for error impact assessment
  public readonly severity: ErrorSeverity;

  // HTTP status code to be returned in API responses
  public readonly statusCode: HttpStatusCode;

  // Additional context data for debugging (e.g., field names, user IDs)
  public readonly context: ErrorContext;

  // Original error that caused this AppError (for error chaining)
  public readonly originalError?: Error | undefined;

  // Whether this is an operational error (expected) or programming error (unexpected)
  public readonly isOperational: boolean;

  // Custom error code for easier identification and handling
  public readonly code?: string | undefined;

  // Timestamp when the error was created
  public readonly timestamp: Date;

  /**
   * Creates a new AppError instance
   * @param params - Configuration object containing error details
   */
  constructor(params: AppErrorParams) {
    const {
      message,
      category,
      severity = 'MEDIUM',
      statusCode = 500,
      context = {},
      originalError,
      isOperational = true,
      code,
    } = params;

    super(message);

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Initialize error properties
    this.name = 'AppError';
    this.category = category;
    this.severity = severity;
    this.statusCode = statusCode;
    this.context = context;
    this.originalError = originalError;
    this.isOperational = isOperational;
    this.code = code;
    this.timestamp = new Date();

    // Capture stack trace for better debugging
    if (
      Error.captureStackTrace !== undefined &&
      Error.captureStackTrace !== null
    ) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Append original error stack trace if available for complete error chain
    if (originalError?.stack != null) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }

  /**
   * Converts error to JSON representation for logging and serialization
   * Includes all error details including stack traces and original error
   * @returns Complete error object with all properties
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      statusCode: this.statusCode,
      code: this.code,
      isOperational: this.isOperational,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
      // Include original error details if available
      ...(this.originalError && {
        originalError: {
          name: this.originalError.name,
          message: this.originalError.message,
          stack: this.originalError.stack,
        },
      }),
    };
  }

  /**
   * Converts error to API response format
   * Provides sanitized error information for client consumption
   * Includes context only in development or for validation errors
   * @returns Client-safe error response object
   */
  public toResponse(): Record<string, unknown> {
    const response: Record<string, unknown> = {
      error: {
        name: this.name,
        message: this.message,
        category: this.category,
        code: this.code,
        timestamp: this.timestamp.toISOString(),
      },
    };

    // Include context in development environment or for validation errors
    // to help with debugging without exposing sensitive information in production
    if (
      process.env['NODE_ENV'] === 'development' ||
      this.category === 'VALIDATION'
    ) {
      (response['error'] as Record<string, unknown>)['context'] = this.context;
    }

    return response;
  }

  /**
   * Checks if this is an operational error (expected business logic errors)
   * as opposed to programming errors or system failures
   * @returns True if operational error, false otherwise
   */
  public get isOperationalError(): boolean {
    return this.isOperational;
  }

  /**
   * Determines if this error should trigger alerts/notifications
   * Based on error severity - HIGH and CRITICAL errors typically require immediate attention
   * @returns True if alert should be triggered, false otherwise
   */
  public shouldAlert(): boolean {
    return this.severity === 'HIGH' || this.severity === 'CRITICAL';
  }

  // ==========================================================================
  // STATIC FACTORY METHODS - Predefined error types for common scenarios
  // ==========================================================================

  /**
   * Creates a validation error for invalid input data
   * @param message - Error description
   * @param context - Additional validation context (e.g., field names, validation rules)
   * @param originalError - Original error that caused the validation failure
   * @returns AppError configured for validation failures
   */
  public static validation(
    message: string,
    context?: ErrorContext,
    originalError?: Error
  ): appError {
    return new appError({
      message,
      category: 'VALIDATION',
      statusCode: 400,
      context,
      originalError,
      code: 'VALIDATION_ERROR',
    });
  }

  /**
   * Creates an authentication error for unauthenticated requests
   * @param message - Error description (default: 'Authentication required')
   * @param context - Additional auth context (e.g., user ID, auth method)
   * @param originalError - Original authentication error
   * @returns AppError configured for authentication failures
   */
  public static authentication(
    message: string = 'Authentication required',
    context?: ErrorContext,
    originalError?: Error
  ): appError {
    return new appError({
      message,
      category: 'AUTHENTICATION',
      statusCode: 401,
      context,
      originalError,
      code: 'AUTHENTICATION_ERROR',
    });
  }

  /**
   * Creates an authorization error for insufficient permissions
   * @param message - Error description (default: 'Insufficient permissions')
   * @param context - Additional authorization context (e.g., required roles, user permissions)
   * @param originalError - Original authorization error
   * @returns AppError configured for authorization failures
   */
  public static authorization(
    message: string = 'Insufficient permissions',
    context?: ErrorContext,
    originalError?: Error
  ): appError {
    return new appError({
      message,
      category: 'AUTHORIZATION',
      statusCode: 403,
      context,
      originalError,
      code: 'AUTHORIZATION_ERROR',
    });
  }

  /**
   * Creates a not found error for missing resources
   * @param resource - Name of the resource that was not found
   * @param context - Additional context (e.g., resource ID, search criteria)
   * @param originalError - Original error that occurred during resource lookup
   * @returns AppError configured for resource not found scenarios
   */
  public static notFound(
    resource: string,
    context?: ErrorContext,
    originalError?: Error
  ): appError {
    return new appError({
      message: `${resource} not found`,
      category: 'NOT_FOUND',
      statusCode: 404,
      context,
      originalError,
      code: 'RESOURCE_NOT_FOUND',
    });
  }

  /**
   * Creates a database error for data persistence failures
   * @param message - Error description
   * @param context - Additional database context (e.g., query, operation type)
   * @param originalError - Original database driver error
   * @returns AppError configured for database failures with HIGH severity
   */
  public static database(
    message: string,
    context?: ErrorContext,
    originalError?: Error
  ): appError {
    return new appError({
      message,
      category: 'DATABASE',
      severity: 'HIGH',
      statusCode: 500,
      context,
      originalError,
      code: 'DATABASE_ERROR',
    });
  }

  /**
   * Creates a conflict error for business logic violations (e.g., duplicate entries)
   * @param message - Error description
   * @param context - Additional conflict context (e.g., conflicting data)
   * @param originalError - Original error that caused the conflict
   * @returns AppError configured for business logic conflicts
   */
  public static conflict(
    message: string,
    context?: ErrorContext,
    originalError?: Error
  ): appError {
    return new appError({
      message,
      category: 'BUSINESS_LOGIC',
      statusCode: 409,
      context,
      originalError,
      code: 'CONFLICT_ERROR',
    });
  }

  /**
   * Creates a rate limiting error for excessive requests
   * @param message - Error description (default: 'Too many requests')
   * @param context - Additional rate limit context (e.g., limit, remaining attempts)
   * @param originalError - Original rate limiting error
   * @returns AppError configured for rate limiting scenarios
   */
  public static rateLimit(
    message: string = 'Too many requests',
    context?: ErrorContext,
    originalError?: Error
  ): appError {
    return new appError({
      message,
      category: 'RATE_LIMITING',
      statusCode: 429,
      context,
      originalError,
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  /**
   * Creates an internal server error for unexpected system failures
   * @param message - Error description (default: 'Internal server error')
   * @param context - Additional internal error context
   * @param originalError - Original internal error
   * @returns AppError configured for internal server errors with HIGH severity
   */
  public static internal(
    message: string = 'Internal server error',
    context?: ErrorContext,
    originalError?: Error
  ): appError {
    return new appError({
      message,
      category: 'INTERNAL_SERVER',
      severity: 'HIGH',
      statusCode: 500,
      context,
      originalError,
      code: 'INTERNAL_SERVER_ERROR',
    });
  }

  // ==========================================================================
  // UTILITY METHODS - Error type checking and conversion
  // ==========================================================================

  /**
   * Type guard to check if an unknown value is an AppError instance
   * @param error - Unknown value to check
   * @returns True if the value is an AppError instance, false otherwise
   */
  public static isAppError(error: unknown): error is appError {
    return error instanceof appError;
  }

  /**
   * Converts an unknown error to AppError instance
   * Handles both AppError instances and native Error objects
   * @param error - Unknown error to convert
   * @param context - Additional context to include with the error
   * @returns AppError instance (either original or converted from unknown error)
   */
  public static fromUnknown(error: unknown, context?: ErrorContext): appError {
    // If already an AppError, return as-is
    if (appError.isAppError(error)) {
      return error;
    }

    // If it's a native Error, wrap it in AppError
    if (error instanceof Error) {
      return new appError({
        message: error.message,
        category: 'UNKNOWN',
        severity: 'MEDIUM',
        statusCode: 500,
        context,
        originalError: error,
        isOperational: false, // Unknown errors from native Errors are not operational
        code: 'UNKNOWN_ERROR',
      });
    }

    // Handle non-Error objects (strings, numbers, etc.)
    return new appError({
      message: 'An unknown error occurred',
      category: 'UNKNOWN',
      severity: 'MEDIUM',
      statusCode: 500,
      context,
      isOperational: false, // Completely unknown errors are not operational
      code: 'UNKNOWN_ERROR',
    });
  }
}

/**
 * Type guard function to check if an unknown value is an AppError instance
 * Alternative to the static method, useful for functional programming
 * @param error - Unknown value to check
 * @returns True if the value is an AppError instance, false otherwise
 */
export const isAppError = (error: unknown): error is appError => {
  return error instanceof appError;
};

export default appError;
