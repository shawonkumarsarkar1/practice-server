import { Request, Response } from 'express';
import appError from '../error/appError';

/**
 * Extended Express Request interface to include optional request ID
 * for request tracing and debugging purposes
 */
export interface CustomRequest extends Request {
  id?: string;
}

/**
 * Centralized error handler that sends standardized error responses to clients
 * Distinguishes between operational errors (expected) and programming errors (unexpected)
 * Ensures consistent error response format across the application
 */
const sendErrorResponse = (
  error: appError,
  req: CustomRequest,
  res: Response
): void => {
  // Operational errors are trusted errors that we expect to occur during normal operation
  if (error.isOperational) {
    console.warn('Operational error:', error.message);
  } else {
    // Programming or unknown errors indicate system failures that require investigation
    console.error('Programming or unknown error:', error);
  }

  // Convert error to standardized response format defined in appError class
  const response = error.toResponse();

  // Include request ID in response for request tracing if available
  if (req.id != null) {
    response['requestId'] = req.id;
  }

  // Send error response with appropriate HTTP status code and formatted body
  res.status(error.statusCode).json(response);
};

export default sendErrorResponse;
