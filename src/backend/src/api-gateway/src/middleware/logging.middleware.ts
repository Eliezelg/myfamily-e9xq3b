import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { Logger } from '../../shared/utils/logger.util';
import { HttpStatusCodes } from '../../shared/constants/status-codes';

/**
 * Extended Express Request interface with tracking metadata
 */
interface RequestWithId extends Request {
  requestId: string;
  correlationId: string;
  startTime: number;
  performanceMetrics?: {
    cpuUsage?: NodeJS.CpuUsage;
    memoryUsage?: NodeJS.MemoryUsage;
  };
}

/**
 * Structure for enhanced logging metadata
 */
interface LogMetadata {
  requestId: string;
  correlationId: string;
  method: string;
  path: string;
  statusCode?: number;
  responseTime?: number;
  headers: Record<string, string>;
  performanceMetrics?: {
    cpuUsage: NodeJS.CpuUsage;
    memoryUsage: NodeJS.MemoryUsage;
    responseTime: number;
  };
  securityContext?: {
    ipAddress: string;
    userAgent: string;
    authToken?: string;
  };
}

/**
 * Enhanced request logging middleware with performance tracking and security monitoring
 * Implements comprehensive logging for API Gateway with ELK Stack integration
 */
export const requestLoggingMiddleware = (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void => {
  // Initialize request tracking metadata
  const requestId = uuidv4();
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  const startTime = process.hrtime();
  const startCpuUsage = process.cpuUsage();
  const startMemoryUsage = process.memoryUsage();

  // Attach tracking metadata to request
  req.requestId = requestId;
  req.correlationId = correlationId;
  req.startTime = Date.now();
  req.performanceMetrics = {
    cpuUsage: startCpuUsage,
    memoryUsage: startMemoryUsage
  };

  // Prepare security context
  const securityContext = {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || 'unknown',
    authToken: req.headers.authorization ? '[PRESENT]' : '[ABSENT]'
  };

  // Log incoming request
  Logger.getInstance({
    service: 'api-gateway',
    level: 'info',
    enableConsole: true,
    enableFile: true,
    enableElk: true
  }).info('Incoming request', {
    requestId,
    correlationId,
    method: req.method,
    path: req.path,
    headers: req.headers,
    query: req.query,
    security: securityContext
  });

  // Override response.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: string | (() => void), cb?: () => void): Response {
    // Calculate performance metrics
    const endTime = process.hrtime(startTime);
    const responseTime = endTime[0] * 1000 + endTime[1] / 1000000; // Convert to milliseconds
    const endCpuUsage = process.cpuUsage(startCpuUsage);
    const endMemoryUsage = process.memoryUsage();

    const performanceMetrics = {
      cpuUsage: endCpuUsage,
      memoryUsage: endMemoryUsage,
      responseTime
    };

    // Prepare response metadata
    const logMetadata: LogMetadata = {
      requestId,
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      headers: res.getHeaders() as Record<string, string>,
      performanceMetrics,
      securityContext
    };

    try {
      // Log response with performance metrics
      const logger = Logger.getInstance({
        service: 'api-gateway',
        level: 'info',
        enableConsole: true,
        enableFile: true,
        enableElk: true
      });

      if (res.statusCode >= 400) {
        logger.error(`Request failed with status ${res.statusCode}`, logMetadata);
      } else {
        logger.info('Request completed successfully', logMetadata);
      }

      // Track performance metrics separately
      logger.debug('Performance metrics', {
        requestId,
        correlationId,
        performance: performanceMetrics
      });
    } catch (error) {
      // Ensure logging errors don't affect response
      console.error('Logging error:', error);
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    // Add response headers for tracking
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Correlation-ID', correlationId);
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    // Call original end function
    return originalEnd.call(this, chunk, encoding as string, cb);
  };

  next();
};