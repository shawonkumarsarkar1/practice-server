const sendErrorResponse = (error: AppError, req: any, res: any) => {
  // Send alert for high severity errors in production
  if (error.shouldAlert() && process.env.NODE_ENV === 'production') {
    sendAlert(error, req);
  }

  // Log operational errors as warnings, others as errors
  if (error.isOperational) {
    console.warn('Operational error:', error.message);
  } else {
    console.error('Programming or unknown error:', error);
  }

  // Send response
  const response = error.toResponse();

  // Include request ID if available
  if (req.id) {
    response.requestId = req.id;
  }

  res.status(error.statusCode).json(response);
};

export default sendErrorResponse;
