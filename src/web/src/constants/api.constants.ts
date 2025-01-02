/**
 * API Constants and Interfaces
 * Version: 1.0.0
 * 
 * Core API configuration for MyFamily platform frontend application
 * Defines endpoints, timeouts, rate limits and TypeScript interfaces
 * for type-safe communication with backend microservices
 */

/**
 * HTTP Methods enum for type-safe API method definitions
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

/**
 * Interface for individual API endpoint configuration
 */
export interface ApiEndpoint {
  path: string;
  method: HttpMethod;
  rateLimit: string;
  cache: boolean;
  timeout: number;
}

/**
 * Interface for grouping related API endpoints
 */
export interface ApiEndpointGroup {
  basePath: string;
  endpoints: Record<string, ApiEndpoint>;
}

/**
 * Current API version for endpoint URLs
 */
export const API_VERSION = 'v1';

/**
 * API timeout configurations in milliseconds
 */
export const API_TIMEOUT = {
  DEFAULT: 30000,    // 30 seconds
  UPLOAD: 300000,    // 5 minutes
  GAZETTE: 60000     // 1 minute
} as const;

/**
 * API response status indicators
 */
export const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error'
} as const;

/**
 * Rate limiting configurations for API endpoints
 */
export const API_RATE_LIMITS = {
  DEFAULT: '1000/hour',
  CONTENT_UPLOAD: '100/min',
  GAZETTE: '500/hour',
  PAYMENT: '50/min'
} as const;

/**
 * API endpoint configurations for different services
 */
export const API_ENDPOINTS: Record<string, ApiEndpointGroup> = {
  AUTH: {
    basePath: '/auth',
    endpoints: {
      LOGIN: {
        path: '/login',
        method: HttpMethod.POST,
        rateLimit: '100/min',
        cache: false,
        timeout: API_TIMEOUT.DEFAULT
      },
      REGISTER: {
        path: '/register',
        method: HttpMethod.POST,
        rateLimit: '50/min',
        cache: false,
        timeout: API_TIMEOUT.DEFAULT
      },
      REFRESH: {
        path: '/refresh',
        method: HttpMethod.POST,
        rateLimit: '100/min',
        cache: false,
        timeout: API_TIMEOUT.DEFAULT
      },
      LOGOUT: {
        path: '/logout',
        method: HttpMethod.POST,
        rateLimit: '50/min',
        cache: false,
        timeout: API_TIMEOUT.DEFAULT
      }
    }
  },
  CONTENT: {
    basePath: '/content',
    endpoints: {
      UPLOAD: {
        path: '/upload',
        method: HttpMethod.POST,
        rateLimit: API_RATE_LIMITS.CONTENT_UPLOAD,
        cache: false,
        timeout: API_TIMEOUT.UPLOAD
      },
      LIST: {
        path: '/list',
        method: HttpMethod.GET,
        rateLimit: API_RATE_LIMITS.DEFAULT,
        cache: true,
        timeout: API_TIMEOUT.DEFAULT
      },
      DELETE: {
        path: '/delete',
        method: HttpMethod.DELETE,
        rateLimit: '100/min',
        cache: false,
        timeout: API_TIMEOUT.DEFAULT
      }
    }
  },
  GAZETTE: {
    basePath: '/gazette',
    endpoints: {
      GENERATE: {
        path: '/generate',
        method: HttpMethod.POST,
        rateLimit: API_RATE_LIMITS.GAZETTE,
        cache: false,
        timeout: API_TIMEOUT.GAZETTE
      },
      PREVIEW: {
        path: '/preview',
        method: HttpMethod.GET,
        rateLimit: API_RATE_LIMITS.GAZETTE,
        cache: true,
        timeout: API_TIMEOUT.DEFAULT
      },
      HISTORY: {
        path: '/history',
        method: HttpMethod.GET,
        rateLimit: API_RATE_LIMITS.DEFAULT,
        cache: true,
        timeout: API_TIMEOUT.DEFAULT
      }
    }
  },
  PAYMENT: {
    basePath: '/payment',
    endpoints: {
      PROCESS: {
        path: '/process',
        method: HttpMethod.POST,
        rateLimit: API_RATE_LIMITS.PAYMENT,
        cache: false,
        timeout: API_TIMEOUT.DEFAULT
      },
      POOL: {
        path: '/pool',
        method: HttpMethod.GET,
        rateLimit: API_RATE_LIMITS.DEFAULT,
        cache: true,
        timeout: API_TIMEOUT.DEFAULT
      }
    }
  },
  FAMILY: {
    basePath: '/family',
    endpoints: {
      CREATE: {
        path: '/create',
        method: HttpMethod.POST,
        rateLimit: '50/min',
        cache: false,
        timeout: API_TIMEOUT.DEFAULT
      },
      UPDATE: {
        path: '/update',
        method: HttpMethod.PUT,
        rateLimit: '100/min',
        cache: false,
        timeout: API_TIMEOUT.DEFAULT
      },
      MEMBERS: {
        path: '/members',
        method: HttpMethod.GET,
        rateLimit: API_RATE_LIMITS.DEFAULT,
        cache: true,
        timeout: API_TIMEOUT.DEFAULT
      }
    }
  }
} as const;