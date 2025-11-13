import {
  CustomValidationError,
  JWTError,
  MongoCastError,
  MongoError,
  MongoValidationError,
  ValidationErrorDetail,
} from '../types/error';

/**
 * Type guard to validate if an unknown error instance is a MongoDB error
 * Identifies MongoDB errors by the presence of either 'code' or 'name' properties
 */
export function isMongoError(error: unknown): error is MongoError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'name' in error)
  );
}

/**
 * Type guard to validate if an unknown error instance is a JWT authentication error
 * Identifies JWT errors by the presence of a string 'name' property
 */
export function isJWTError(error: unknown): error is JWTError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    typeof (error as JWTError).name === 'string'
  );
}

/**
 * Transforms MongoDB duplicate key error into standardized application error
 * Handles E11000 duplicate key errors by extracting field and value from keyValue
 */
export const formatMongoDuplicateKeyError = (
  error: Error & { keyValue?: Record<string, unknown> }
): Error => {
  const field = Object.keys(error.keyValue ?? {})[0];
  const value = error.keyValue?.['field'] as string | number | undefined;
  const message = `Duplicate value '${value}' for field '${field}'. This value already exists.`;

  const formattedError = new Error(message);
  formattedError.name = 'DuplicateKeyError';
  return formattedError;
};

/**
 * Transforms MongoDB cast error into standardized application error
 * Handles invalid data type conversions (e.g., string to ObjectId, number to date)
 */
export const formatMongoCastError = (error: MongoCastError): Error => {
  const message = `Invalid ${error.path}: ${error.value}. Please provide a valid value.`;

  const formattedError = new Error(message);
  formattedError.name = 'CastError';
  return formattedError;
};

/**
 * Transforms MongoDB validation error into structured application validation error
 * Aggregates all schema validation failures into detailed error collection
 */
export const formatMongoValidationError = (
  error: MongoValidationError
): CustomValidationError => {
  const errors: ValidationErrorDetail[] = Object.values(error.errors ?? {}).map(
    err => ({
      field: err.path,
      message: err.message,
      value: err.value,
    })
  );

  const formattedError = new Error(
    'Validation failed'
  ) as CustomValidationError;
  formattedError.name = 'ValidationError';
  formattedError.details = errors;

  return formattedError;
};
