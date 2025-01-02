/**
 * Enhanced API Service Implementation
 * Version: 1.0.0
 * 
 * Production-grade API service with comprehensive security, monitoring,
 * and resilience features for the MyFamily platform frontend.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'; // ^1.3.0
import CircuitBreaker from 'opossum'; // ^6.0.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import { apiConfig } from '../config/api.config';
import { API_ENDPOINTS, API_STATUS } from '../constants/api.constants';

/**
 * Interface for circuit breaker statistics
 */
interface CircuitBreakerStats {
  failures: number;
  fallbacks: number;
  successes: number;
  rejected: number;
  timeout: number;
  lastFailureTime?: Date;
  state: string;
}

/**
 * Interface for enhanced API service with resilience features
 */
export interface ApiService {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  upload<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T>;
  refreshToken(): Promise<void>;
  getCircuitBreakerStats(): CircuitBreakerStats;
}

/**
 * Enhanced API service implementation with comprehensive security and resilience features
 */
class ApiServiceImpl implements ApiService {
  private readonly client: AxiosInstance;
  private readonly circuitBreaker: CircuitBreaker;
  private correlationId: string;

  constructor() {
    // Initialize axios instance with enhanced configuration
    this.client = axios.create(apiConfig);
    this.correlationId = uuidv4();

    // Initialize circuit breaker with configuration
    this.circuitBreaker = new CircuitBreaker(this.executeRequest.bind(this), {
      timeout: 30000, // 30 second timeout
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      name: 'api-circuit-breaker'
    });

    // Setup request interceptor for authentication and correlation
    this.client.interceptors.request.use(
      (config) => {
        // Add correlation ID to each request
        config.headers['X-Correlation-ID'] = this.correlationId;
        
        // Add authentication token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }

        // Log request details
        console.debug(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
          correlationId: this.correlationId,
          timestamp: new Date().toISOString()
        });

        return config;
      },
      (error) => {
        console.error('[API] Request Error:', {
          correlationId: this.correlationId,
          error: error.message
        });
        return Promise.reject(error);
      }
    );

    // Setup response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response) => {
        // Log successful response
        console.debug('[API] Response:', {
          correlationId: this.correlationId,
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      async (error) => {
        // Handle token expiration
        if (error.response?.status === 401) {
          try {
            await this.refreshToken();
            // Retry the original request
            return this.client(error.config);
          } catch (refreshError) {
            // Handle refresh token failure
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        // Log error details
        console.error('[API] Response Error:', {
          correlationId: this.correlationId,
          status: error.response?.status,
          message: error.message,
          url: error.config?.url
        });

        return Promise.reject(error);
      }
    );

    // Setup circuit breaker event handlers
    this.circuitBreaker.on('success', () => {
      console.debug('[Circuit Breaker] Request successful');
    });

    this.circuitBreaker.on('failure', (error) => {
      console.error('[Circuit Breaker] Request failed:', error);
    });

    this.circuitBreaker.on('timeout', () => {
      console.warn('[Circuit Breaker] Request timeout');
    });

    this.circuitBreaker.on('reject', () => {
      console.warn('[Circuit Breaker] Request rejected (circuit open)');
    });
  }

  /**
   * Execute request with circuit breaker and retry logic
   */
  private async executeRequest<T>(
    method: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse = await this.client.request({
        method,
        url,
        data,
        ...config
      });

      return response.data;
    } catch (error: any) {
      // Enhanced error handling with correlation ID
      const enhancedError = new Error(`API Request Failed: ${error.message}`);
      (enhancedError as any).correlationId = this.correlationId;
      (enhancedError as any).status = error.response?.status;
      throw enhancedError;
    }
  }

  /**
   * GET request with circuit breaker protection
   */
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.circuitBreaker.fire('GET', url, undefined, config);
  }

  /**
   * POST request with circuit breaker protection
   */
  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.circuitBreaker.fire('POST', url, data, config);
  }

  /**
   * PUT request with circuit breaker protection
   */
  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.circuitBreaker.fire('PUT', url, data, config);
  }

  /**
   * DELETE request with circuit breaker protection
   */
  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.circuitBreaker.fire('DELETE', url, undefined, config);
  }

  /**
   * File upload with progress tracking
   */
  public async upload<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    };

    return this.post<T>(url, formData, config);
  }

  /**
   * Refresh authentication token
   */
  public async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.client.post(
        API_ENDPOINTS.AUTH.endpoints.REFRESH.path,
        { refreshToken }
      );

      if (response.data.status === API_STATUS.SUCCESS) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('refresh_token', response.data.refreshToken);
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('[API] Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Get circuit breaker statistics
   */
  public getCircuitBreakerStats(): CircuitBreakerStats {
    return {
      failures: this.circuitBreaker.stats.failures,
      fallbacks: this.circuitBreaker.stats.fallbacks,
      successes: this.circuitBreaker.stats.successes,
      rejected: this.circuitBreaker.stats.rejected,
      timeout: this.circuitBreaker.stats.timeout,
      lastFailureTime: this.circuitBreaker.stats.lastFailure,
      state: this.circuitBreaker.status.state
    };
  }
}

// Export singleton instance
export const apiService = new ApiServiceImpl();