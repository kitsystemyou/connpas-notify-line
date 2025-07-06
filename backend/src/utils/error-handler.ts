import { Logger } from './logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;
    
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ErrorHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  handleError(error: Error | AppError, context?: any): void {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      context,
    };

    if (error instanceof AppError) {
      (errorInfo as any).statusCode = error.statusCode;
      (errorInfo as any).isOperational = error.isOperational;
      (errorInfo as any).errorContext = error.context;
    }

    this.logger.error('Application error occurred', error, errorInfo);

    // Send to error monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorMonitoring(error, errorInfo);
    }

    // Re-throw if not operational
    if (error instanceof AppError && !error.isOperational) {
      throw error;
    }
  }

  private async sendToErrorMonitoring(error: Error, errorInfo: any): Promise<void> {
    try {
      // Here you would integrate with error monitoring services like:
      // - Google Cloud Error Reporting
      // - Sentry
      // - Rollbar
      // For now, we'll just log it
      this.logger.error('Error monitoring alert', error, {
        ...errorInfo,
        alert: true,
        severity: 'high',
      });
    } catch (monitoringError) {
      this.logger.error('Failed to send error to monitoring service', monitoringError);
    }
  }

  createErrorResponse(error: Error | AppError): { 
    error: string; 
    statusCode: number; 
    timestamp: string;
    details?: any;
  } {
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof AppError ? error.message : 'Internal server error';
    
    const response = {
      error: message,
      statusCode,
      timestamp: new Date().toISOString(),
    };

    // Add details in development mode
    if (process.env.NODE_ENV === 'development') {
      (response as any).details = {
        stack: error.stack,
        name: error.name,
      };
    }

    return response;
  }
}

// Common error types
export class ConnpassApiError extends AppError {
  constructor(message: string, context?: any) {
    super(`Connpass API Error: ${message}`, 502, true, context);
  }
}

export class LineApiError extends AppError {
  constructor(message: string, context?: any) {
    super(`LINE API Error: ${message}`, 502, true, context);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: any) {
    super(`Database Error: ${message}`, 500, true, context);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: any) {
    super(`Validation Error: ${message}`, 400, true, context);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, context?: any) {
    super(`Authentication Error: ${message}`, 401, true, context);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, context?: any) {
    super(`Rate Limit Error: ${message}`, 429, true, context);
  }
}

// Utility functions
export const handleAsyncError = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorHandler: ErrorHandler,
  context?: any
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    errorHandler.handleError(error as Error, context);
    throw error;
  }
};

export const createRetryWrapper = (
  maxRetries: number = 3,
  backoffMs: number = 1000,
  logger?: Logger
) => {
  return async <T>(operation: () => Promise<T>, context?: string): Promise<T> => {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (logger) {
          logger.warn(`Retry attempt ${attempt}/${maxRetries} failed`, {
            context,
            error: (error as Error).message,
            attempt,
          });
        }
        
        if (attempt < maxRetries) {
          const delay = backoffMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  };
};