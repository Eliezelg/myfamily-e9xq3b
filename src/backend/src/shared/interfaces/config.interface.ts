/**
 * Core configuration interfaces for the MyFamily platform
 * Defines type-safe configuration objects for various platform services
 */

/**
 * CORS configuration interface with comprehensive security options
 * @see Technical Specifications/2.7.2 Security Architecture
 */
export interface CORSConfig {
  /** Allowed origins for CORS requests */
  origin: string[];
  /** Allowed HTTP methods */
  methods: string[];
  /** Allowed headers in requests */
  allowedHeaders: string[];
  /** Whether to allow credentials */
  credentials: boolean;
  /** Maximum age of preflight requests cache in seconds */
  maxAge: number;
  /** Headers exposed to the browser */
  exposedHeaders: string[];
}

/**
 * Rate limiting configuration interface for API protection
 * @see Technical Specifications/3.3.2 Endpoint Specifications
 */
export interface RateLimitConfig {
  /** Time window for rate limiting in milliseconds */
  windowMs: number;
  /** Maximum number of requests within the window */
  max: number;
  /** Custom error message for rate limit exceeded */
  message: string;
  /** HTTP status code for rate limit exceeded */
  statusCode: number;
  /** Whether to skip counting failed requests */
  skipFailedRequests: boolean;
  /** Whether to skip counting successful requests */
  skipSuccessfulRequests: boolean;
}

/**
 * JWT authentication configuration interface
 * @see Technical Specifications/7.1.1 Authentication Methods
 */
export interface JWTConfig {
  /** Secret key for token signing */
  secret: string;
  /** Token expiration time */
  expiresIn: string;
  /** JWT signing algorithm */
  algorithm: string;
  /** Token issuer */
  issuer: string;
  /** Token audience */
  audience: string;
  /** Refresh token expiration time */
  refreshExpiresIn: string;
}

/**
 * Redis configuration interface for caching and session management
 * @see Technical Specifications/4.3 Databases & Storage
 */
export interface RedisConfig {
  /** Redis server host */
  host: string;
  /** Redis server port */
  port: number;
  /** Redis authentication password */
  password: string;
  /** Redis database number */
  db: number;
  /** Key prefix for namespacing */
  keyPrefix: string;
  /** Whether to use Redis cluster */
  cluster: boolean;
  /** Whether to use TLS connection */
  tls: boolean;
}

/**
 * AWS S3 configuration interface for media storage
 * @see Technical Specifications/4.3 Databases & Storage
 */
export interface S3Config {
  /** S3 bucket name */
  bucket: string;
  /** AWS region */
  region: string;
  /** AWS access key ID */
  accessKeyId: string;
  /** AWS secret access key */
  secretAccessKey: string;
  /** Custom S3 endpoint (optional) */
  endpoint: string;
  /** Whether to use server-side encryption */
  encryption: boolean;
  /** CloudFront CDN configuration */
  cloudFront: {
    enabled: boolean;
    domain: string;
  };
}

/**
 * Print service configuration interface with detailed specifications
 * @see Technical Specifications/8.1.1 Print Production Specifications
 */
export interface PrintConfig {
  /** Print service API URL */
  apiUrl: string;
  /** Print service API key */
  apiKey: string;
  /** Default print format (e.g., 'A4') */
  defaultFormat: string;
  /** Print resolution in DPI */
  resolution: number;
  /** Color profile for printing */
  colorProfile: string;
  /** Paper stock configuration */
  paperStock: {
    cover: string;
    interior: string;
  };
  /** Bleed margin in millimeters */
  bleed: number;
  /** Binding type */
  binding: string;
}