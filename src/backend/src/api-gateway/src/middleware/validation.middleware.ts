/**
 * @fileoverview Enhanced Express middleware for request validation in the API Gateway
 * Provides comprehensive input validation, schema validation, data sanitization,
 * and security controls with advanced features including rate limiting and telemetry
 * Version: 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { validate } from 'class-validator'; // ^0.14.0
import { plainToClass } from 'class-transformer'; // ^0.5.1
import { validateInput, sanitizeInput } from '../../../shared/utils/validation.util';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { HttpStatusCodes } from '../../../shared/constants/status-codes';
import { ApiError } from './error.middleware';
import { Logger } from '../../../shared/utils/logger.util';

/**
 * Interface defining validation schema structure with versioning and classification
 */
interface ValidationSchema {
  type: string;
  properties: Record<string, any>;
  required?: string[];
  version: string;
  dataClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  securityControls: {
    rateLimit?: {
      maxRequests: number;
      windowMs: number;
    };
    maxRequestSize?: number;
    requireEncryption?: boolean;
    validateContentType?: boolean;
  };
}

/**
 * Cache for validation results to improve performance
 */
const validationCache = new Map<string, {
  result: boolean;
  timestamp: number;
  ttl: number;
}>();

/**
 * Validation metrics for monitoring and telemetry
 */
const validationMetrics = {
  totalValidations: 0,
  failedValidations: 0,
  cacheHits: 0,
  averageValidationTime: 0,
};

/**
 * Enhanced validation middleware with advanced security features
 */
export default function validationMiddleware(
  schema: ValidationSchema,
  source: 'body' | 'query' | 'params' = 'body',
  options: {
    cacheResults?: boolean;
    cacheTTL?: number;
    enableMetrics?: boolean;
  } = {}
) {
  const logger = Logger.getInstance({
    service: 'api-gateway',
    level: 'info',
    enableConsole: true,
    enableFile: true,
    enableElk: true
  });

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    try {
      // Generate correlation ID for request tracking
      const correlationId = `val-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      req.headers['x-correlation-id'] = correlationId;

      // Check request size limits
      if (schema.securityControls.maxRequestSize) {
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);
        if (contentLength > schema.securityControls.maxRequestSize) {
          throw new ApiError(
            HttpStatusCodes.BAD_REQUEST,
            ErrorCodes.VALIDATION_ERROR,
            'Request size exceeds maximum allowed limit',
            { contentLength, maxSize: schema.securityControls.maxRequestSize }
          );
        }
      }

      // Apply rate limiting if configured
      if (schema.securityControls.rateLimit) {
        const clientIp = req.ip;
        const cacheKey = `rateLimit:${clientIp}:${req.path}`;
        const requestCount = await getRateLimitCount(cacheKey);
        
        if (requestCount > schema.securityControls.rateLimit.maxRequests) {
          throw new ApiError(
            HttpStatusCodes.TOO_MANY_REQUESTS,
            ErrorCodes.VALIDATION_ERROR,
            'Rate limit exceeded',
            { clientIp, path: req.path }
          );
        }
      }

      // Extract data from request based on source
      const data = req[source];

      // Check validation cache if enabled
      if (options.cacheResults) {
        const cacheKey = generateCacheKey(schema, data);
        const cachedResult = validationCache.get(cacheKey);
        
        if (cachedResult && (Date.now() - cachedResult.timestamp) < (options.cacheTTL || 5000)) {
          validationMetrics.cacheHits++;
          if (!cachedResult.result) {
            throw new ApiError(
              HttpStatusCodes.BAD_REQUEST,
              ErrorCodes.VALIDATION_ERROR,
              'Validation failed (cached result)',
              { schema: schema.type }
            );
          }
          next();
          return;
        }
      }

      // Sanitize input data
      const sanitizedData = sanitizeInput(data);

      // Transform data to class instance for validation
      const instance = plainToClass(schema as any, sanitizedData);

      // Validate schema version compatibility
      validateSchemaVersion(schema.version);

      // Validate data against schema
      const validationResult = await validateInput(instance, schema as any);

      if (!validationResult.isValid) {
        validationMetrics.failedValidations++;
        throw new ApiError(
          HttpStatusCodes.BAD_REQUEST,
          ErrorCodes.VALIDATION_ERROR,
          'Validation failed',
          {
            errors: validationResult.errors,
            schema: schema.type,
            correlationId
          }
        );
      }

      // Apply data classification security controls
      applySecurityControls(sanitizedData, schema.dataClassification);

      // Update validation cache if enabled
      if (options.cacheResults) {
        const cacheKey = generateCacheKey(schema, data);
        validationCache.set(cacheKey, {
          result: true,
          timestamp: Date.now(),
          ttl: options.cacheTTL || 5000
        });
      }

      // Update validation metrics
      if (options.enableMetrics) {
        updateValidationMetrics(startTime);
      }

      // Attach validated data to request
      req[source] = sanitizedData;

      // Log successful validation
      logger.info('Request validation successful', {
        correlationId,
        schema: schema.type,
        dataClassification: schema.dataClassification,
        validationTime: Date.now() - startTime
      });

      next();
    } catch (error) {
      // Log validation failure
      logger.error('Request validation failed', {
        correlationId: req.headers['x-correlation-id'],
        schema: schema.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        validationTime: Date.now() - startTime
      });

      next(error);
    }
  };
}

/**
 * Helper function to generate cache key for validation results
 */
function generateCacheKey(schema: ValidationSchema, data: any): string {
  return `${schema.type}:${JSON.stringify(data)}`;
}

/**
 * Helper function to validate schema version compatibility
 */
function validateSchemaVersion(version: string): void {
  const currentVersion = '1.0.0';
  if (version !== currentVersion) {
    throw new ApiError(
      HttpStatusCodes.BAD_REQUEST,
      ErrorCodes.VALIDATION_ERROR,
      'Schema version mismatch',
      { required: currentVersion, provided: version }
    );
  }
}

/**
 * Helper function to apply security controls based on data classification
 */
function applySecurityControls(data: any, classification: string): void {
  switch (classification) {
    case 'RESTRICTED':
      // Additional encryption and access controls for restricted data
      if (!isEncrypted(data)) {
        throw new ApiError(
          HttpStatusCodes.BAD_REQUEST,
          ErrorCodes.VALIDATION_ERROR,
          'Encryption required for restricted data'
        );
      }
      break;
    case 'CONFIDENTIAL':
      // PII and sensitive data handling
      filterSensitiveData(data);
      break;
    case 'INTERNAL':
      // Basic security controls
      validateInternalData(data);
      break;
    case 'PUBLIC':
      // Minimal security controls
      sanitizePublicData(data);
      break;
  }
}

/**
 * Helper function to update validation metrics
 */
function updateValidationMetrics(startTime: number): void {
  const validationTime = Date.now() - startTime;
  validationMetrics.totalValidations++;
  validationMetrics.averageValidationTime = 
    (validationMetrics.averageValidationTime * (validationMetrics.totalValidations - 1) + validationTime) 
    / validationMetrics.totalValidations;
}

/**
 * Helper function to get rate limit count from cache
 */
async function getRateLimitCount(key: string): Promise<number> {
  // Implementation would integrate with Redis or similar cache
  return 0; // Placeholder
}

/**
 * Helper function to check if data is encrypted
 */
function isEncrypted(data: any): boolean {
  // Implementation would check for encryption headers or markers
  return true; // Placeholder
}

/**
 * Helper function to filter sensitive data
 */
function filterSensitiveData(data: any): void {
  // Implementation would remove or mask sensitive data
}

/**
 * Helper function to validate internal data
 */
function validateInternalData(data: any): void {
  // Implementation would validate internal data requirements
}

/**
 * Helper function to sanitize public data
 */
function sanitizePublicData(data: any): void {
  // Implementation would sanitize public data
}