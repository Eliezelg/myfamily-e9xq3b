/**
 * Cross-Origin Resource Sharing (CORS) configuration for the API Gateway
 * Implements secure cross-origin policies with strict origin validation
 * @see Technical Specifications/2.7.2 Security Architecture
 * @version cors@2.8.5
 */

import { CORSConfig } from '../../shared/interfaces/config.interface';

/**
 * Validate and sanitize allowed origins from environment variables
 * Filters out empty values and trims whitespace
 */
const ALLOWED_ORIGINS = [
  process.env.WEB_URL,
  process.env.MOBILE_URL,
  process.env.STAGING_URL
].filter(Boolean).map(origin => origin?.trim());

/**
 * Explicitly allowed HTTP methods
 * Restricted to essential operations for security
 */
const ALLOWED_METHODS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'OPTIONS'
];

/**
 * Explicitly allowed request headers
 * Includes essential headers for API operations
 */
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'Accept',
  'Origin',
  'X-Requested-With',
  'X-CSRF-Token',
  'X-API-Key'
];

/**
 * Headers exposed to client applications
 * Limited to necessary response headers
 */
const EXPOSED_HEADERS = [
  'Content-Disposition',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining'
];

/**
 * CORS preflight cache duration in seconds
 * Set to 2 hours for optimal performance
 */
const CORS_MAX_AGE = 7200;

/**
 * Factory function to generate environment-specific CORS configuration
 * Implements strict security measures and origin validation
 * @returns {CORSConfig} Secure CORS configuration object
 */
const getCorsConfig = (): CORSConfig => {
  if (!ALLOWED_ORIGINS.length) {
    throw new Error('No allowed origins configured. Check environment variables: WEB_URL, MOBILE_URL, STAGING_URL');
  }

  return {
    // Strict origin validation
    origin: ALLOWED_ORIGINS,
    
    // Restricted HTTP methods
    methods: ALLOWED_METHODS,
    
    // Essential headers only
    allowedHeaders: ALLOWED_HEADERS,
    
    // Enable secure credentials handling
    credentials: true,
    
    // Preflight cache duration
    maxAge: CORS_MAX_AGE,
    
    // Exposed response headers
    exposedHeaders: EXPOSED_HEADERS
  };
};

/**
 * Production-ready CORS configuration with enhanced security measures
 * @type {CORSConfig}
 */
export const corsConfig = getCorsConfig();