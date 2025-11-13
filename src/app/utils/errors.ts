import { JWTError, MongoError } from '../types/error';

export function isMongoError(error: unknown): error is MongoError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'name' in error)
  );
}

export function isJWTError(error: unknown): error is JWTError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    typeof (error as JWTError).name === 'string'
  );
}

export const formatMongoDuplicateKeyError = (error: any): Error => {
  const field = Object.keys(error.keyValue || {})[0];
  const value = error.keyValue?.[field];
  const message = `Duplicate value '${value}' for field '${field}'. This value already exists.`;

  const formattedError = new Error(message);
  formattedError.name = 'DuplicateKeyError';
  return formattedError;
};

export const formatMongoCastError = (error: any): Error => {
  const message = `Invalid ${error.path}: ${error.value}. Please provide a valid value.`;

  const formattedError = new Error(message);
  formattedError.name = 'CastError';
  return formattedError;
};

export const formatMongoValidationError = (error: any): Error => {
  const errors = Object.values(error.errors || {}).map((err: any) => ({
    field: err.path,
    message: err.message,
    value: err.value,
  }));

  const message = 'Validation failed';
  const formattedError = new Error(message);
  formattedError.name = 'ValidationError';
  (formattedError as any).details = errors;

  return formattedError;
};
