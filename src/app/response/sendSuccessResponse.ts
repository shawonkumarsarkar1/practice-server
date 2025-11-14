import appError from '../error/appError';
import { SuccessResponse, SuccessResponseParams } from '../types/success';

/**
 * Sends a standardized success response for API endpoints
 * This function ensures consistent success response structure across the entire application
 * and includes proper validation of input parameters
 *
 * @template T - Type of the data payload being returned in the response
 * @param params - Configuration object containing response parameters
 * @throws {Error} When required parameters are missing or invalid
 */
export const sendSuccessResponse = <T = unknown>(
  params: SuccessResponseParams<T>
): void => {
  const { res, statusCode = 200, message, data, meta } = params;

  // Validate that the Express response object is provided
  if (res === null || res === undefined) {
    throw appError.internal('Response object (res) is required');
  }

  // Ensure a valid message string is provided for all success responses
  if (!message || typeof message !== 'string') {
    throw appError.internal('Valid message string is required');
  }

  // Restrict status codes to the 2xx range for success responses only
  if (statusCode && (statusCode < 200 || statusCode >= 300)) {
    throw appError.internal(
      'Status code must be in the 2xx range for success responses'
    );
  }

  // Construct standardized success response object
  // Only include data and meta properties when they are provided and meaningful
  const response: SuccessResponse<T> = {
    success: true, // Explicitly indicates this is a successful response
    statusCode, // HTTP status code for the response
    message: message.trim(), // Cleaned message describing the successful operation
    timestamp: new Date().toISOString(), // ISO timestamp for request tracking
    ...(data !== undefined && { data }), // Conditionally include data payload
    ...(meta && Object.keys(meta).length > 0 && { meta }), // Conditionally include metadata
  };

  // Send the formatted response with appropriate HTTP status code
  res.status(statusCode).json(response);
};
