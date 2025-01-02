/**
 * JWT Configuration for MyFamily Authentication Service
 * Implements secure token generation and validation parameters
 * @see Technical Specifications/7.1.1 Authentication Methods
 */

import { JWTConfig } from '../../../shared/interfaces/config.interface';

/**
 * Validates JWT secret meets minimum security requirements (256-bit)
 * @param secret - The JWT secret to validate
 * @throws Error if secret doesn't meet security requirements
 * @returns true if secret is valid
 */
const validateJWTSecret = (secret: string): boolean => {
  if (!secret) {
    throw new Error('JWT_SECRET must be provided');
  }

  // Ensure minimum length for 256-bit security (32 bytes = 256 bits)
  if (Buffer.from(secret).length < 32) {
    throw new Error('JWT_SECRET must be at least 256 bits (32 characters) long');
  }

  // Verify character composition (should contain mix of characters)
  const hasUpperCase = /[A-Z]/.test(secret);
  const hasLowerCase = /[a-z]/.test(secret);
  const hasNumbers = /\d/.test(secret);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(secret);

  if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChars)) {
    throw new Error('JWT_SECRET must contain uppercase, lowercase, numbers, and special characters');
  }

  return true;
};

/**
 * Helper function to throw error for required environment variables
 * @param message - Error message
 */
const throwError = (message: string): never => {
  throw new Error(message);
};

// Environment variables with secure defaults
const JWT_SECRET = process.env.JWT_SECRET || throwError('JWT_SECRET must be set and be at least 256 bits');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_ALGORITHM = process.env.JWT_ALGORITHM || 'HS256';
const JWT_ISSUER = process.env.JWT_ISSUER || 'myfamily-auth-service';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'myfamily-api';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * JWT configuration object implementing enhanced security settings
 * @see Technical Specifications/7.1.1 Authentication Methods
 */
export const jwtConfig: JWTConfig = {
  secret: validateJWTSecret(JWT_SECRET),
  expiresIn: JWT_EXPIRES_IN,
  algorithm: JWT_ALGORITHM,
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
  refreshExpiresIn: JWT_REFRESH_EXPIRES_IN
};