/**
 * @fileoverview Express middleware for centralized error handling in the API Gateway
 * Provides standardized error responses, logging, and error code mapping
 * Version: 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { ErrorCodes, ErrorMessages } from '../../../shared/constants/error-codes';
import { HttpStatusCodes } from '../../../shared/constants/status-codes';
import { Logger } from '../../../shared/utils/logger.util';

/**
 * Interface for standardized error response format
 */
interface ErrorResponse {
  status: 'error';
  errorCode: number;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
}

/**
 * Custom API Error class with enhanced tracking capabilities
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly correlationId: string;

  constructor(
    statusCode: number,
    errorCode: number,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = this.filterSensitiveData(details);
    this.correlationId = this.generateCorrelationId();
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Generate unique correlation ID for error tracking
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Filter sensitive information from error details
   */
  private filterSensitiveData(details?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!details) return undefined;

    const sensitiveKeys = ['password', 'token', 'apiKey', 'creditCard', 'ssn'];
    const filtered = { ...details };

    Object.keys(filtered).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        filtered[key] = '[REDACTED]';
      }
    });

    return filtered;
  }
}

/**
 * Central error handling middleware for API Gateway
 * Provides standardized error responses with enhanced security and monitoring
 */
export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const logger = Logger.getInstance({
    service: 'api-gateway',
    level: 'error',
    enableConsole: true,
    enableFile: true,
    enableElk: true
  });

  // Determine error details and status code
  const isApiError = error instanceof ApiError;
  const statusCode = isApiError 
    ? error.statusCode 
    : HttpStatusCodes.INTERNAL_SERVER_ERROR;
  const errorCode = isApiError
    ? error.errorCode
    : ErrorCodes.INTERNAL_SERVER_ERROR;
  const message = isApiError
    ? error.message
    : ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR];
  const correlationId = isApiError
    ? error.correlationId
    : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Log error with correlation ID and request context
  logger.error(
    `Error processing request: ${error.message}`,
    {
      correlationId,
      requestId: req.headers['x-request-id'] as string,
      userId: req.headers['x-user-id'] as string,
      path: req.path,
      method: req.method,
      additionalInfo: {
        errorCode,
        statusCode,
        stack: error.stack,
        details: isApiError ? error.details : undefined
      },
      security: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        authMethod: req.headers['authorization'] ? 'JWT' : 'None'
      }
    },
    error
  );

  // Prepare standardized error response
  const errorResponse: ErrorResponse = {
    status: 'error',
    errorCode,
    message,
    details: isApiError ? error.details : undefined,
    timestamp: new Date().toISOString(),
    correlationId
  };

  // Add correlation ID to response headers for tracking
  res.setHeader('X-Correlation-ID', correlationId);

  // Send error response
  res.status(statusCode).json(errorResponse);
};