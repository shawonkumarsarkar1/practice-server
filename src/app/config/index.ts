import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(process.cwd(), '.env') });

// Enhanced validation function with proper boolean handling
function validateRequiredEnvVars(envVars: string[]): void {
  const missing: string[] = [];

  for (const envVar of envVars) {
    const value = process.env[envVar];
    if (value === undefined || value === null || value.trim() === '') {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

// Validate required environment variables before building config
validateRequiredEnvVars(['DATABASE_URL', 'FRONTEND_URL']);

interface IEnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  FRONTEND_URL: string;
  PORT: number;
  DATABASE_URL: string;
  SERVER_START_TIMEOUT: number;
  SHUTDOWN_TIMEOUT: number;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'http' | 'debug';
  LOG_MAX_SIZE: string;
  LOG_MAX_FILES: string;
  ERROR_LOG_RETENTION: string;
}

// Helper functions for type-safe environment variable parsing
function getStringEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value !== undefined && value !== null && value.trim() !== ''
    ? value.trim()
    : defaultValue;
}

function getNumberEnv(
  key: string,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  const value = process.env[key];
  if (value === undefined || value === null) return defaultValue;

  const parsed = parseInt(value, 10);
  const result = isNaN(parsed) ? defaultValue : parsed;

  if (min !== undefined && result < min) {
    throw new Error(`${key} must be at least ${min}`);
  }
  if (max !== undefined && result > max) {
    throw new Error(`${key} must be at most ${max}`);
  }

  return result;
}

function getNodeEnv(): IEnvConfig['NODE_ENV'] {
  const env = process.env['NODE_ENV']?.toLowerCase();
  if (env === 'production' || env === 'test') {
    return env;
  }
  return 'development';
}

function getLogLevel(): IEnvConfig['LOG_LEVEL'] {
  const level = process.env['LOG_LEVEL']?.toLowerCase();
  const validLevels: Array<IEnvConfig['LOG_LEVEL']> = [
    'error',
    'warn',
    'info',
    'http',
    'debug',
  ];

  return validLevels.includes(level as IEnvConfig['LOG_LEVEL'])
    ? (level as IEnvConfig['LOG_LEVEL'])
    : 'info';
}

const isProduction = getNodeEnv() === 'production';

// Build configuration with type safety
const envConfig: IEnvConfig = {
  NODE_ENV: getNodeEnv(),
  FRONTEND_URL: getStringEnv(
    'FRONTEND_URL',
    isProduction
      ? (() => {
          throw new Error('FRONTEND_URL is required in production');
        })()
      : 'http://localhost:5000'
  ),
  PORT: getNumberEnv('PORT', 5000, 1, 65535),
  DATABASE_URL: getStringEnv('DATABASE_URL', ''),
  SERVER_START_TIMEOUT: getNumberEnv('SERVER_START_TIMEOUT', 30000, 1000),
  SHUTDOWN_TIMEOUT: getNumberEnv('SHUTDOWN_TIMEOUT', 10000, 1000),
  LOG_LEVEL: getLogLevel(),
  LOG_MAX_SIZE: getStringEnv('LOG_MAX_SIZE', '20m'),
  LOG_MAX_FILES: getStringEnv('LOG_MAX_FILES', '15d'),
  ERROR_LOG_RETENTION: getStringEnv('ERROR_LOG_RETENTION', '30d'),
};

// Additional validation for production
if (isProduction) {
  if (envConfig.FRONTEND_URL === '') {
    throw new Error('FRONTEND_URL is required in production mode');
  }

  // Validate FRONTEND_URL format in production
  try {
    new URL(envConfig.FRONTEND_URL);
  } catch {
    throw new Error('FRONTEND_URL must be a valid URL in production');
  }
}

// Freeze the config to prevent runtime modifications
Object.freeze(envConfig);

export default envConfig;
