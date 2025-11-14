import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an asynchronous Express RequestHandler to ensure proper error propagation
 * to Express error handling middleware. This utility automatically captures
 * unhandled promise rejections and forwards them via the `next` function,
 * maintaining consistent error handling across all asynchronous route handlers.
 *
 * @param fn - Asynchronous Express RequestHandler function to be wrapped
 * @returns RequestHandler with integrated error handling that forwards
 *          any caught exceptions to Express error middleware
 *
 * @implementation
 * - Returns a new RequestHandler that executes the provided function
 * - Uses Promise.resolve() to handle both async functions and promise-returning functions
 * - Applies .catch() to intercept any rejected promises and forward errors via next(error)
 * - Maintains original function signature and successful execution path
 */
const catchAsync = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default catchAsync;
