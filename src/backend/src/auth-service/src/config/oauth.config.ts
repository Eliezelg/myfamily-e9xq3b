/**
 * OAuth 2.0 Configuration
 * Implements secure social authentication settings for the MyFamily platform
 * @see Technical Specifications/7.1.1 Authentication Methods
 * @version 1.0.0
 */

import { OAuthConfig } from '../../../shared/interfaces/config.interface';

/**
 * Interface for Google OAuth specific configuration
 * Ensures type safety for all required OAuth parameters
 */
interface GoogleOAuthConfig {
  /** Google OAuth client ID from Google Cloud Console */
  clientID: string;
  /** Google OAuth client secret from Google Cloud Console */
  clientSecret: string;
  /** OAuth callback URL for handling authentication response */
  callbackURL: string;
  /** Required OAuth scopes for accessing user data */
  scope: string[];
  /** Whether to pass request object to callback */
  passReqToCallback: boolean;
  /** Whether to use state parameter for CSRF protection */
  state: boolean;
  /** Whether to verify certificates */
  verify: boolean;
}

/**
 * Environment-specific configuration values
 * Retrieved from environment variables with fallbacks
 */
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';
const OAUTH_ENABLED = process.env.OAUTH_ENABLED === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Validates OAuth configuration settings
 * Ensures all required fields are present and properly formatted
 * @param config - Google OAuth configuration object
 * @throws Error if configuration is invalid
 */
const validateOAuthConfig = (config: GoogleOAuthConfig): boolean => {
  if (!OAUTH_ENABLED) {
    return true;
  }

  if (!config.clientID || !config.clientSecret) {
    throw new Error('Missing required Google OAuth credentials');
  }

  if (!config.callbackURL || !config.callbackURL.startsWith('http')) {
    throw new Error('Invalid callback URL format');
  }

  if (!config.scope || !config.scope.includes('email')) {
    throw new Error('Email scope is required for Google OAuth');
  }

  return true;
};

/**
 * OAuth configuration object implementing OAuthConfig interface
 * Provides validated settings for social authentication
 */
export const oauthConfig: OAuthConfig = {
  google: {
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email'],
    passReqToCallback: true,
    state: true,
    verify: NODE_ENV === 'production'
  }
};

// Validate configuration on initialization
validateOAuthConfig(oauthConfig.google as GoogleOAuthConfig);

/**
 * Export validated OAuth configuration
 * @see Technical Specifications/7.1.1 Authentication Methods
 */
export default oauthConfig;