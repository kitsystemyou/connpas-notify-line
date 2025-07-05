import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';

export class MonitoringMiddleware {
  private logger: Logger;
  private errorHandler: ErrorHandler;

  constructor() {
    this.logger = new Logger('MonitoringMiddleware');
    this.errorHandler = new ErrorHandler(this.logger);
  }

  requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    // Add request ID to request object
    req['requestId'] = requestId;

    this.logger.info('Request started', {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      headers: this.sanitizeHeaders(req.headers),
    });

    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(body) {
      const duration = Date.now() - startTime;
      
      const logger = new Logger('MonitoringMiddleware');
      logger.info('Request completed', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        responseSize: JSON.stringify(body).length,
      });

      return originalJson.call(this, body);
    };

    next();
  };

  errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
    const requestId = req['requestId'];
    
    this.errorHandler.handleError(error, {
      requestId,
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      params: req.params,
    });

    const errorResponse = this.errorHandler.createErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  };

  healthCheck = (req: Request, res: Response) => {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    this.logger.info('Health check requested', {
      requestId: req['requestId'],
      healthStatus,
    });

    res.json(healthStatus);
  };

  metricsEndpoint = async (req: Request, res: Response) => {
    try {
      const metrics = await this.collectMetrics();
      
      this.logger.info('Metrics requested', {
        requestId: req['requestId'],
        metricsCount: Object.keys(metrics).length,
      });

      res.json(metrics);
    } catch (error) {
      this.errorHandler.handleError(error, {
        requestId: req['requestId'],
        endpoint: 'metrics',
      });
      
      res.status(500).json({ error: 'Failed to collect metrics' });
    }
  };

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private async collectMetrics(): Promise<any> {
    return {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
      },
      application: {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
        region: process.env.FUNCTION_REGION || 'asia-northeast1',
      },
      // Add custom metrics here
      custom: {
        functionInvocations: this.getFunctionInvocations(),
        lastProcessingTime: this.getLastProcessingTime(),
      },
    };
  }

  private getFunctionInvocations(): number {
    // In a real implementation, this would come from a metrics store
    return 0;
  }

  private getLastProcessingTime(): string | null {
    // In a real implementation, this would come from a metrics store
    return null;
  }
}

export const monitoring = new MonitoringMiddleware();

// Performance monitoring decorator
export const withPerformanceMonitoring = (operationName: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const logger = new Logger('PerformanceMonitor');

    descriptor.value = async function(...args: any[]) {
      const startTime = Date.now();
      const context = {
        operationName,
        className: target.constructor.name,
        methodName: propertyKey,
        arguments: args.length,
      };

      try {
        logger.info(`Starting operation: ${operationName}`, context);
        const result = await originalMethod.apply(this, args);
        
        const duration = Date.now() - startTime;
        logger.createPerformanceLog(operationName, startTime, {
          ...context,
          success: true,
          duration,
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Operation failed: ${operationName}`, error, {
          ...context,
          success: false,
          duration,
        });
        throw error;
      }
    };

    return descriptor;
  };
};