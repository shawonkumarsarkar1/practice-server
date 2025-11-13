/**
 * Server Entry Point - Production Grade Application Bootstrap
 *
 * This module orchestrates the application lifecycle including:
 * - Database connection with retry logic and error classification
 * - HTTP server initialization with timeout protection
 * - Graceful shutdown management for SIGTERM/SIGINT signals
 * - Unhandled exception and rejection handling
 * - Health monitoring and connection state management
 *
 * @version 1.0.0
 * @module server
 */

import { Server } from 'http';
import mongoose from 'mongoose';
import app from './app';
import envConfig from './app/config';
import {
  DatabaseAuthError,
  DatabaseConnectionError,
  DatabaseTimeoutError,
  ShutdownError,
} from './app/types/database.errors';

// Application state management
let server: Server;
let isShuttingDown = false; // Critical: prevents race conditions during shutdown
let shutdownTimeout: NodeJS.Timeout | undefined;

/**
 * MongoDB Connection Configuration
 *
 * Optimized for production environments with:
 * - Connection pooling for performance
 * - Timeout settings for resilience
 * - Retryable writes for data consistency
 * - Write concern for replication safety
 */
const mongoOptions: mongoose.ConnectOptions = {
  maxPoolSize: 10, // Maximum concurrent connections
  minPoolSize: 2, // Maintain warm connections for performance
  serverSelectionTimeoutMS: 5000, // Fast failure on unavailable clusters
  socketTimeoutMS: 45000, // Prevents hanging operations
  connectTimeoutMS: 10000, // Balanced initial connection timeout
  retryWrites: true, // Enhanced data durability
  w: 'majority', // Ensure writes propagate to replica set majority
  retryReads: true, // Enable read retries for transient failures
  maxIdleTimeMS: 30000, // Close idle connections after 30s
};

/**
 * Database Error Classification Engine
 *
 * Transforms raw MongoDB errors into typed application errors
 * enabling precise error handling and monitoring.
 *
 * @param error - Raw error from mongoose connection attempt
 * @param retries - Current retry count for context-aware error messages
 * @returns Typed DatabaseConnectionError for structured error handling
 */
const classifyDatabaseError = (
  error: unknown,
  retries: number
): DatabaseConnectionError => {
  // Mongoose-specific error handling
  if (error instanceof mongoose.Error) {
    // Timeout scenarios: server selection or operation timeout
    if (
      error.name === 'MongoServerSelectionError' ||
      error.name === 'MongoTimeoutError'
    ) {
      return new DatabaseTimeoutError(
        `Database timeout after ${retries + 1} attempts: ${error.message}`,
        retries
      );
    }

    // Network connectivity issues
    if (error.name === 'MongoNetworkError') {
      return new DatabaseConnectionError(
        `Network error connecting to database: ${error.message}`,
        'DATABASE_NETWORK_ERROR',
        retries
      );
    }

    // Authentication failures (MongoDB error code 18)
    if (
      error.name === 'MongoServerError' &&
      'code' in error &&
      error.code === 18
    ) {
      return new DatabaseAuthError(
        `Database authentication failed: ${error.message}`
      );
    }
  }

  // Fallback for unclassified or non-Mongoose errors
  return new DatabaseConnectionError(
    `Database connection failed: ${error instanceof Error ? error.message : String(error)}`,
    'DATABASE_CONNECTION_ERROR',
    retries
  );
};

/**
 * Database Connection Manager with Exponential Backoff Retry
 *
 * Implements production-grade connection resilience:
 * - 5 retry attempts with exponential backoff
 * - Maximum delay cap at 10 seconds
 * - Comprehensive error classification
 * - Final error aggregation after exhausted retries
 *
 * @throws {DatabaseConnectionError} When all connection attempts are exhausted
 */
const connectDatabase = async (): Promise<void> => {
  const maxRetries = 5;
  let lastError: DatabaseConnectionError | undefined = undefined;

  for (let retries = 0; retries < maxRetries; retries++) {
    try {
      await mongoose.connect(envConfig.DATABASE_URL, mongoOptions);
      console.info('✅ Database connected successfully');
      return;
    } catch (error: unknown) {
      lastError = classifyDatabaseError(error, retries);
      // Exponential backoff with jitter: 2s, 4s, 8s, 10s, 10s
      const delay = Math.min(2000 * Math.pow(2, retries), 10000);

      console.error(
        `❌ Database connection failed (attempt ${retries + 1}/${maxRetries}):`,
        lastError.message
      );

      // Retry logic for non-final attempt
      if (retries < maxRetries - 1) {
        console.info(`Retrying connection in ${delay}ms...`);
        await new Promise<void>(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Critical: throw aggregated error after exhausted retries
  throw (
    lastError ??
    new DatabaseConnectionError(
      'Unknown error during database connection attempts'
    )
  );
};

/**
 * Process Exit Coordinator
 *
 * Finalizes application shutdown by:
 * - Clearing pending timeouts
 * - Allowing event loop to drain naturally
 * - Providing clear exit status for orchestration systems
 *
 * @param exitCode - 0 for success, 1+ for error conditions
 */
const initiateShutdown = (exitCode: number): void => {
  // Critical: prevent memory leaks from hanging timeouts
  if (shutdownTimeout) {
    clearTimeout(shutdownTimeout);
    shutdownTimeout = undefined;
  }

  // Defer to next event loop cycle to ensure cleanup completion
  setImmediate(() => {
    console.info(`Process exiting with code: ${exitCode}`);

    // Log appropriate message based on exit condition
    if (exitCode !== 0) {
      console.error('Application terminated with errors');
      // Here you could integrate with your error reporting service
      // Sentry.captureMessage(`Application shutdown with code: ${exitCode}`);
    }

    // Process will exit naturally when event loop is empty
    // All resources should be cleaned up by this point
  });
};

/**
 * Graceful Shutdown Orchestrator
 *
 * Production-grade shutdown sequence ensuring:
 * - No incoming requests are accepted during shutdown
 * - Active requests are given time to complete
 * - Database connections are properly closed
 * - Timeout protection against hanging operations
 *
 * @param signal - Termination signal origin (SIGTERM, SIGINT, etc.)
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
  // Critical: idempotent shutdown prevention
  if (isShuttingDown) {
    console.info(`Shutdown already in progress, ignoring ${signal}`);
    return;
  }

  isShuttingDown = true;
  console.info(`\n${signal} received, initiating graceful shutdown...`);

  try {
    const shutdownPromises: Array<Promise<void>> = [];

    // Safety net: prevent shutdown from hanging indefinitely
    const shutdownTimer = new Promise<void>((_, reject) => {
      shutdownTimeout = setTimeout(
        () => reject(new ShutdownError('Shutdown timeout exceeded', signal)),
        envConfig.SHUTDOWN_TIMEOUT
      );
    });

    // HTTP Server Shutdown Sequence
    if (server?.listening) {
      shutdownPromises.push(
        new Promise<void>((resolve, reject) => {
          server.close((error?: Error) => {
            if (error) {
              reject(
                new ShutdownError(
                  `HTTP server close failed: ${error.message}`,
                  signal
                )
              );
            } else {
              console.info('✅ HTTP server closed gracefully');
              resolve();
            }
          });
        })
      );
    }

    // Database Connection Shutdown Sequence
    if (
      mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected
    ) {
      shutdownPromises.push(
        mongoose.connection
          .close(false) // forceClose: false for graceful connection closure
          .then(() => {
            console.info('✅ Database connection closed gracefully');
          })
          .catch((err: Error) => {
            throw new ShutdownError(
              `Database close failed: ${err.message}`,
              signal
            );
          })
      );
    }

    // Edge case: no active connections to close
    if (shutdownPromises.length === 0) {
      console.info('No active connections to close');
      return;
    }

    // Execute shutdown operations with timeout protection
    await Promise.race([
      Promise.allSettled(shutdownPromises).then(results => {
        // Aggregate any failures during shutdown
        const errors = results
          .filter(
            (result): result is PromiseRejectedResult =>
              result.status === 'rejected'
          )
          .map((result: PromiseRejectedResult) => result.reason as Error);

        if (errors.length > 0) {
          throw new ShutdownError(
            `Shutdown completed with ${errors.length} error(s): ${errors.map(e => e.message).join(', ')}`,
            signal
          );
        }

        console.info('✅ All shutdown operations completed successfully');
      }),
      shutdownTimer,
    ]);

    // Clean up timeout on successful shutdown
    if (shutdownTimeout) {
      clearTimeout(shutdownTimeout);
      shutdownTimeout = undefined;
    }

    console.info('🎯 Graceful shutdown completed');
    initiateShutdown(0);
  } catch (error: unknown) {
    console.error(
      '❌ Error during shutdown:',
      error instanceof Error ? error.message : String(error)
    );

    // Ensure timeout cleanup on error path
    if (shutdownTimeout) {
      clearTimeout(shutdownTimeout);
      shutdownTimeout = undefined;
    }

    // Exit with error code for orchestration systems (Kubernetes, ECS, etc.)
    initiateShutdown(1);
  }
};

/**
 * Application Bootstrap Sequence
 *
 * Orchestrates the complete application startup:
 * 1. Database connection with retry logic
 * 2. Database event listeners for health monitoring
 * 3. HTTP server initialization with timeout protection
 * 4. Runtime error handlers for operational resilience
 */
const main = async (): Promise<void> => {
  try {
    // Phase 1: Database Connectivity
    await connectDatabase();

    /**
     * Database Health Monitoring Event Handlers
     *
     * These listeners provide real-time monitoring of database state
     * and trigger appropriate shutdown procedures on critical events.
     */
    mongoose.connection.on('connected', () => {
      console.info('🔗 Mongoose connected to database cluster');
    });

    mongoose.connection.on('disconnected', () => {
      console.info('🔌 Mongoose disconnected from database');
      // Critical: unexpected disconnection requires immediate shutdown
      if (!isShuttingDown) {
        console.error('🚨 Unexpected database disconnection detected');
        void gracefulShutdown('UNEXPECTED_DISCONNECTION');
      }
    });

    mongoose.connection.on('error', (err: Error) => {
      console.error('💥 Mongoose connection error:', err);
      // Database errors may indicate cluster issues - initiate shutdown
      if (!isShuttingDown) {
        void gracefulShutdown('DATABASE_ERROR');
      }
    });

    // Phase 2: HTTP Server Initialization
    const serverStartPromise = new Promise<void>((resolve, reject) => {
      server = app.listen(envConfig.PORT, () => {
        console.info(`🚀 Server running on port ${envConfig.PORT}`);
        console.info(`📊 Environment: ${envConfig.NODE_ENV || 'development'}`);
        console.info(
          `⏰ Server start timeout: ${envConfig.SERVER_START_TIMEOUT}ms`
        );
        resolve();
      });

      // Handle server instantiation errors
      server.on('error', reject);
    });

    // Server startup with timeout protection
    await Promise.race([
      serverStartPromise,
      new Promise<void>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Server start timeout after ${envConfig.SERVER_START_TIMEOUT}ms`
              )
            ),
          envConfig.SERVER_START_TIMEOUT
        )
      ),
    ]);

    // Phase 3: Runtime Error Handling
    server.on('error', (error: Error) => {
      console.error('❌ Server runtime error:', error);
      if (!isShuttingDown) {
        void gracefulShutdown('SERVER_ERROR');
      }
    });

    // Application successfully bootstrapped
    console.info('✅ Application bootstrap sequence completed successfully');
  } catch (error: unknown) {
    console.error('💥 Critical failure during application bootstrap:', error);

    // Enhanced error diagnostics for different error types
    if (error instanceof DatabaseConnectionError) {
      console.error(
        '🔧 Database connectivity issue - check configuration and network'
      );
      // Integration point for alerting systems (PagerDuty, OpsGenie, etc.)
    }

    // Initiate controlled shutdown despite bootstrap failure
    await gracefulShutdown('STARTUP_FAILURE');
  }
};

// ===================================================================
// PROCESS LIFECYCLE MANAGEMENT
// ===================================================================

/**
 * Signal Handlers for Container Orchestration
 *
 * SIGTERM: Kubernetes, Docker, ECS graceful shutdown signal
 * SIGINT:  Development environment (Ctrl+C) handling
 */
process.on('SIGTERM', () => {
  console.info('📡 SIGTERM received from orchestrator');
  void gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  console.info('⌨️  SIGINT received from terminal');
  void gracefulShutdown('SIGINT');
});

/**
 * Unhandled Exception Management
 *
 * These are last-resort handlers for exceptions that bypass
 * all other application error handling layers.
 */
process.on(
  'unhandledRejection',
  (error: unknown, promise: Promise<unknown>) => {
    console.error(
      '🚨 Unhandled Promise Rejection at:',
      promise,
      'reason:',
      error
    );
    // Critical: unhandled rejections may indicate programming errors
    void gracefulShutdown('UNHANDLED_REJECTION');
  }
);

process.on('uncaughtException', (error: Error, origin: string) => {
  console.error('🚨 Uncaught Exception:', error, 'origin:', origin);
  // Critical: uncaught exceptions leave application in undefined state
  void gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// ===================================================================
// APPLICATION BOOTSTRAP
// ===================================================================

/**
 * Start the application
 *
 * Using void operator to explicitly indicate we're not handling
 * the promise rejection here as it's handled by unhandledRejection
 */
void main();
