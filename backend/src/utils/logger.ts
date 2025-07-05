import { Logging } from '@google-cloud/logging';

export class Logger {
  private logging: Logging;
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logging = new Logging({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });
  }

  private formatMessage(level: string, message: string, metadata?: any): any {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      severity: level.toUpperCase(),
      service: this.serviceName,
      message,
      ...(metadata && { metadata }),
    };

    return logEntry;
  }

  info(message: string, metadata?: any): void {
    const logEntry = this.formatMessage('INFO', message, metadata);
    console.log(JSON.stringify(logEntry));
    
    if (process.env.NODE_ENV === 'production') {
      this.writeToCloudLogging('INFO', logEntry);
    }
  }

  error(message: string, error?: any, metadata?: any): void {
    const errorMetadata = {
      ...metadata,
      ...(error && {
        error: {
          message: error.message || error,
          stack: error.stack,
          name: error.name,
        },
      }),
    };

    const logEntry = this.formatMessage('ERROR', message, errorMetadata);
    console.error(JSON.stringify(logEntry));
    
    if (process.env.NODE_ENV === 'production') {
      this.writeToCloudLogging('ERROR', logEntry);
    }
  }

  warn(message: string, metadata?: any): void {
    const logEntry = this.formatMessage('WARNING', message, metadata);
    console.warn(JSON.stringify(logEntry));
    
    if (process.env.NODE_ENV === 'production') {
      this.writeToCloudLogging('WARNING', logEntry);
    }
  }

  debug(message: string, metadata?: any): void {
    if (process.env.NODE_ENV === 'development') {
      const logEntry = this.formatMessage('DEBUG', message, metadata);
      console.debug(JSON.stringify(logEntry));
    }
  }

  private async writeToCloudLogging(severity: string, logEntry: any): Promise<void> {
    try {
      const log = this.logging.log('connpass-reminder');
      
      const metadata = {
        resource: {
          type: 'cloud_function',
          labels: {
            function_name: 'connpass-reminder',
            region: process.env.FUNCTION_REGION || 'asia-northeast1',
          },
        },
        severity,
        labels: {
          service: this.serviceName,
        },
      };

      const entry = log.entry(metadata, logEntry);
      await log.write(entry);
    } catch (error) {
      console.error('Failed to write to Cloud Logging:', error);
    }
  }

  createStructuredLog(operation: string, status: 'success' | 'error' | 'warning', details?: any): void {
    const logData = {
      operation,
      status,
      executionTime: Date.now(),
      details,
    };

    switch (status) {
      case 'success':
        this.info(`Operation completed: ${operation}`, logData);
        break;
      case 'error':
        this.error(`Operation failed: ${operation}`, details?.error, logData);
        break;
      case 'warning':
        this.warn(`Operation warning: ${operation}`, logData);
        break;
    }
  }

  createPerformanceLog(operation: string, startTime: number, metadata?: any): void {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const performanceData = {
      operation,
      duration,
      startTime,
      endTime,
      ...metadata,
    };

    this.info(`Performance: ${operation} completed in ${duration}ms`, performanceData);
  }
}

export const createLogger = (serviceName: string): Logger => {
  return new Logger(serviceName);
};