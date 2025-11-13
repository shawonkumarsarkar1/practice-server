export type ErrorCategory =
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'DATABASE'
  | 'EXTERNAL_SERVICE'
  | 'NOT_FOUND'
  | 'BUSINESS_LOGIC'
  | 'INTERNAL_SERVER'
  | 'RATE_LIMITING'
  | 'NETWORK'
  | 'UNKNOWN';

// Error severity levels
export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// HTTP status codes mapping
export type HttpStatusCode =
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 409 // Conflict
  | 422 // Unprocessable Entity
  | 429 // Too Many Requests
  | 500 // Internal Server Error
  | 502 // Bad Gateway
  | 503; // Service Unavailable

// Interface for error context metadata
export interface ErrorContext {
  userId?: string;
  requestId?: string;
  resourceId?: string;
  operation?: string;
  inputData?: unknown;
  externalService?: string;
  [key: string]: unknown;
}

// Interface for error construction parameters
export interface AppErrorParams {
  message: string | undefined;
  category: ErrorCategory | undefined;
  severity?: ErrorSeverity | undefined;
  statusCode?: HttpStatusCode | undefined;
  context?: ErrorContext | undefined;
  originalError?: Error | undefined;
  isOperational?: boolean | undefined;
  code?: string | undefined;
}
