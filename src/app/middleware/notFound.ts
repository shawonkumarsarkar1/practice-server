import { Request, Response, NextFunction } from 'express';
import appError from '../error/appError';
import { AppErrorParams } from '../types/error';

const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  const error: AppErrorParams = appError.notFound('API endpoint', {
    path: req.path,
    method: req.method,
    originalUrl: req.originalUrl,
    userAgent: req.get('User-Agent'),
  });

  next(error);
};

export default notFound;
