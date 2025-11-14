/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';

export interface SuccessResponseParams<T = any> {
  res: Response;
  statusCode?: number;
  message: string;
  data?: T;
  meta?: Record<string, any>;
}

export interface SuccessResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  meta?: Record<string, any>;
  timestamp: string;
}
