/**
 * API Utilities Module
 * Version: 1.0.0
 * 
 * Comprehensive utility module for API request handling, response transformation,
 * error handling, and secure API operations used across the frontend application.
 */

import axios, { AxiosResponse, AxiosError } from 'axios'; // ^1.3.0
import { API_VERSION, API_STATUS } from '../constants/api.constants';
import { apiConfig } from '../config/api.config';

/**
 * Enhanced interface for standardized API response format
 */
export interface ApiResponse<T = any> {
  status: string;
  data: T;
  meta: Record<string, any>;
  timestamp: string;
  version: string;
}

/**
 * Enhanced interface for detailed API error response
 */
export interface ApiError {
  status: string;
  code: string;
  message: string;
  details: Record<string, any>;
  timestamp: string;
  trackingId: string;
  requestId: string;
}

/**
 * Constructs complete API URL with version, endpoint, and query parameters
 */
export const buildApiUrl = (endpoint: string, queryParams?: Record<string, any>): string => {
  // Validate endpoint format
  if (!endpoint.startsWith('/')) {
    endpoint = `/${endpoint}`;
  }

  // Construct base URL with version
  let url = `${apiConfig.baseURL}/api/${API_VERSION}${endpoint}`;

  // Add query parameters if provided
  if (queryParams && Object.keys(queryParams).length > 0) {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    url += `?${params.toString()}`;
  }

  return url;
};

/**
 * Enhanced response handler with validation and transformation capabilities
 */
export const handleApiResponse = <T>(response: AxiosResponse): ApiResponse<T> => {
  // Validate response structure
  if (!response?.data) {
    throw new Error('Invalid API response structure');
  }

  // Check API version compatibility
  const responseVersion = response.headers['x-api-version'] || API_VERSION;
  if (responseVersion !== API_VERSION) {
    console.warn(`API version mismatch. Expected ${API_VERSION}, got ${responseVersion}`);
  }

  // Transform response to standard format
  const standardResponse: ApiResponse<T> = {
    status: API_STATUS.SUCCESS,
    data: response.data.data || response.data,
    meta: {
      ...response.data.meta,
      statusCode: response.status,
      headers: response.headers
    },
    timestamp: new Date().toISOString(),
    version: responseVersion
  };

  return standardResponse;
};

/**
 * Comprehensive error handler with detailed error classification and tracking
 */
export const handleApiError = (error: AxiosError): ApiError => {
  // Generate unique tracking ID for error
  const trackingId = crypto.randomUUID();
  const requestId = error.config?.headers?.['X-Request-ID'] || crypto.randomUUID();

  // Extract error details
  const errorResponse: ApiError = {
    status: API_STATUS.ERROR,
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred',
    details: {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    },
    timestamp: new Date().toISOString(),
    trackingId,
    requestId
  };

  // Log error details for monitoring
  console.error('[API Error]', {
    ...errorResponse,
    stack: error.stack
  });

  return errorResponse;
};

/**
 * Enhanced token management with validation and refresh mechanism
 */
export const setAuthToken = async (token: string, shouldRefresh = true): Promise<void> => {
  // Validate token format
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid authentication token');
  }

  // Update axios default headers
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

  // Update apiConfig headers
  apiConfig.headers['Authorization'] = `Bearer ${token}`;

  // Store token securely
  try {
    sessionStorage.setItem('auth_token', token);
  } catch (error) {
    console.error('Failed to store authentication token:', error);
  }

  // Set up token refresh mechanism if enabled
  if (shouldRefresh) {
    // Parse token expiry
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = tokenData.exp * 1000; // Convert to milliseconds
      const refreshBuffer = 5 * 60 * 1000; // 5 minutes before expiry
      const timeUntilRefresh = expiryTime - Date.now() - refreshBuffer;

      if (timeUntilRefresh > 0) {
        setTimeout(async () => {
          try {
            const response = await axios.post(buildApiUrl('/auth/refresh'));
            const newToken = response.data.token;
            await setAuthToken(newToken, true);
          } catch (error) {
            console.error('Token refresh failed:', error);
            // Handle refresh failure (e.g., redirect to login)
          }
        }, timeUntilRefresh);
      }
    } catch (error) {
      console.error('Failed to setup token refresh:', error);
    }
  }
};

// Configure axios defaults with enhanced error handling
axios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(handleApiError(error))
);

// Configure axios defaults with security headers
axios.defaults.baseURL = apiConfig.baseURL;
axios.defaults.timeout = apiConfig.timeout;
axios.defaults.headers.common = {
  ...axios.defaults.headers.common,
  ...apiConfig.headers
};