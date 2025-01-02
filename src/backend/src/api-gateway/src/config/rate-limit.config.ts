/**
 * Rate limiting configuration for the API Gateway
 * Implements endpoint-specific rate limits to protect against abuse
 * @see Technical Specifications/3.3.2 Endpoint Specifications
 * @version express-rate-limit@6.7.0
 */

import { RateLimitConfig } from '../../../shared/interfaces/config.interface';
import rateLimit from 'express-rate-limit';

/**
 * Constants for rate limit configuration
 */
export const RATE_LIMIT_MESSAGE = 'Too many requests from this IP, please try again later.';
export const HOUR_IN_MS = 3600000;
export const MINUTE_IN_MS = 60000;

/**
 * Interface for endpoint-specific rate limit configurations
 */
export interface EndpointRateLimit extends RateLimitConfig {
  skipFailedRequests: boolean;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

/**
 * Factory function to create standardized rate limit configurations
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum number of requests allowed in the window
 * @returns Configured rate limit object
 */
const createRateLimitConfig = (windowMs: number, max: number): EndpointRateLimit => {
  if (windowMs <= 0 || max <= 0) {
    throw new Error('Window and max values must be positive numbers');
  }

  return {
    windowMs,
    max,
    message: RATE_LIMIT_MESSAGE,
    statusCode: 429, // Too Many Requests
    skipFailedRequests: true, // Don't count failed requests
    skipSuccessfulRequests: false,
    standardHeaders: true, // Return rate limit info in headers (RateLimit-*)
    legacyHeaders: false // Disable legacy X-RateLimit-* headers
  };
};

/**
 * Rate limit configuration for /api/v1/families endpoint
 * Limit: 1000 requests per hour
 */
export const familiesRateLimit = rateLimit(
  createRateLimitConfig(HOUR_IN_MS, 1000)
);

/**
 * Rate limit configuration for /api/v1/content endpoint
 * Limit: 100 requests per minute
 */
export const contentRateLimit = rateLimit(
  createRateLimitConfig(MINUTE_IN_MS, 100)
);

/**
 * Rate limit configuration for /api/v1/gazettes endpoint
 * Limit: 500 requests per hour
 */
export const gazettesRateLimit = rateLimit(
  createRateLimitConfig(HOUR_IN_MS, 500)
);

/**
 * Rate limit configuration for /api/v1/pool endpoint
 * Limit: 50 requests per minute
 */
export const poolRateLimit = rateLimit(
  createRateLimitConfig(MINUTE_IN_MS, 50)
);