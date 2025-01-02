/**
 * Authentication interfaces for MyFamily web frontend
 * Implements JWT-based authentication, 2FA, and RBAC
 * @version 1.0.0
 */

import { UserRole } from '../../../backend/src/shared/interfaces/user.interface';

/**
 * User status enumeration for frontend state management
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Login credentials interface
 * Used for initial authentication requests
 */
export interface ILoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data interface
 * Used for new user account creation
 */
export interface IRegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  language: string;
}

/**
 * Authentication response interface
 * Contains JWT tokens and user data after successful authentication
 */
export interface IAuthResponse {
  token: string;           // JWT access token
  refreshToken: string;    // JWT refresh token
  expiresIn: number;      // Token expiration time in seconds
  user: IAuthUser;        // Authenticated user data
}

/**
 * Authenticated user interface
 * Contains user data available after authentication
 */
export interface IAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  language: string;
  twoFactorEnabled: boolean;
  lastLoginAt: Date;
  status: UserStatus;
  sessionId: string;      // For session tracking and management
}

/**
 * Two-factor authentication verification interface
 * Used for 2FA code validation
 */
export interface ITwoFactorVerification {
  userId: string;
  code: string;           // Verification code from SMS/Email
}

/**
 * Password reset request interface
 * Used for initiating password recovery
 */
export interface IPasswordReset {
  email: string;
}

/**
 * Token refresh interface
 * Used for JWT token renewal
 */
export interface ITokenRefresh {
  refreshToken: string;
}

/**
 * Authentication error interface
 * Standardized error response format
 */
export interface IAuthError {
  code: string;           // Error code for client-side handling
  message: string;        // User-friendly error message
  details: Record<string, any>; // Additional error context
}