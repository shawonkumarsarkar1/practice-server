export class DatabaseConnectionError extends Error {
  public readonly code: string;
  public readonly retries: number;

  constructor(
    message: string,
    code: string = 'DATABASE_CONNECTION_ERROR',
    retries: number = 0
  ) {
    super(message);
    this.name = 'DatabaseConnectionError';
    this.code = code;
    this.retries = retries;
  }
}

export class DatabaseTimeoutError extends DatabaseConnectionError {
  constructor(message: string, retries: number = 0) {
    super(message, 'DATABASE_TIMEOUT_ERROR', retries);
  }
}

export class DatabaseAuthError extends DatabaseConnectionError {
  constructor(message: string) {
    super(message, 'DATABASE_AUTH_ERROR');
  }
}

export class ShutdownError extends Error {
  public readonly signal: string;

  constructor(message: string, signal: string) {
    super(message);
    this.name = 'ShutdownError';
    this.signal = signal;
  }
}
