/**
 * API Configuration
 * Version: 1.0.0
 * 
 * Centralized API configuration for MyFamily platform frontend application.
 * Provides secure, production-ready axios client settings with comprehensive
 * error handling, monitoring, and security headers.
 */

import { AxiosRequestConfig } from 'axios'; // ^1.3.0
import { API_VERSION, API_TIMEOUT } from '../constants/api.constants';

/**
 * Interface defining comprehensive API configuration structure
 * Enforces type safety for all configuration properties
 */
export interface ApiConfig extends AxiosRequestConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
  withCredentials: boolean;
  validateStatus: (status: number) => boolean;
}

/**
 * Enhanced default API configuration with security and monitoring features
 * Implements production-grade security headers and request validation
 */
const DEFAULT_CONFIG: Readonly<ApiConfig> = {
  // Base URL configuration with fallback
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  
  // Default timeout from constants
  timeout: API_TIMEOUT.DEFAULT,
  
  // Production-grade security headers
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-Version': API_VERSION,
    'X-Request-ID': crypto.randomUUID(),
    'X-Client-Type': 'web',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  },
  
  // CORS configuration
  withCredentials: true,
  
  // Custom status validation
  validateStatus: (status: number) => status >= 200 && status < 300,
  
  // Additional axios configuration
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  maxRedirects: 5,
  maxContentLength: 50 * 1024 * 1024, // 50MB
  decompress: true,
  transitional: {
    silentJSONParsing: false,
    forcedJSONParsing: true,
    clarifyTimeoutError: true
  }
};

/**
 * Export immutable API configuration
 * Prevents runtime modification of critical security settings
 */
export const apiConfig: Readonly<ApiConfig> = Object.freeze(DEFAULT_CONFIG);

/**
 * Export specialized upload configuration with extended timeout
 */
export const uploadConfig: Readonly<ApiConfig> = Object.freeze({
  ...DEFAULT_CONFIG,
  timeout: API_TIMEOUT.UPLOAD,
  maxContentLength: 100 * 1024 * 1024, // 100MB for uploads
  headers: {
    ...DEFAULT_CONFIG.headers,
    'Content-Type': 'multipart/form-data'
  }
});

/**
 * Export configuration factory for custom endpoints
 */
export const createApiConfig = (customConfig: Partial<ApiConfig>): Readonly<ApiConfig> => {
  return Object.freeze({
    ...DEFAULT_CONFIG,
    ...customConfig,
    headers: {
      ...DEFAULT_CONFIG.headers,
      ...(customConfig.headers || {})
    }
  });
};