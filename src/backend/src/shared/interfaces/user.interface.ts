/**
 * Core user-related interfaces, types and enums for MyFamily platform
 * Implements comprehensive user management, authentication, and authorization
 * with enhanced security features and GDPR compliance
 */

/**
 * User roles for Role-Based Access Control (RBAC)
 * Defines strict hierarchical access levels across the platform
 */
export enum UserRole {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',        // Full platform access
  FAMILY_ADMIN = 'FAMILY_ADMIN',        // Family-level administration
  CONTENT_CONTRIBUTOR = 'CONTENT_CONTRIBUTOR', // Content creation and management
  MEMBER = 'MEMBER'                     // Basic family member access
}

/**
 * User account statuses
 * Aligned with system-wide status codes for consistent state management
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',                    // Fully operational account
  PENDING_VERIFICATION = 'PENDING_VERIFICATION', // Awaiting email/2FA verification
  SUSPENDED = 'SUSPENDED',              // Temporarily disabled account
  ARCHIVED = 'ARCHIVED'                 // Inactive, data retained for compliance
}

/**
 * Core user interface
 * Comprehensive user properties with security and audit features
 */
export interface IUser {
  id: string;                           // Unique user identifier
  email: string;                        // Primary email address (GDPR-compliant)
  firstName: string;                    // User's first name
  lastName: string;                     // User's last name
  role: UserRole;                       // User's role for RBAC
  status: UserStatus;                   // Current account status
  language: string;                     // Preferred language (ISO 639-1)
  twoFactorEnabled: boolean;            // 2FA activation status
  lastLoginAt: Date;                    // Last successful login timestamp
  createdAt: Date;                      // Account creation timestamp
  updatedAt: Date;                      // Last update timestamp
}

/**
 * User preferences interface
 * Comprehensive customization settings including internationalization
 */
export interface IUserPreferences {
  language: string;                     // Preferred language (ISO 639-1)
  emailNotifications: boolean;          // Email notification preferences
  timezone: string;                     // User timezone (IANA format)
  dateFormat: string;                   // Preferred date format
  communicationPreferences: {           // Communication channel preferences
    emailUpdates: boolean;              // Regular email updates
    gazetteNotifications: boolean;      // Gazette-related notifications
    familyUpdates: boolean;             // Family activity notifications
    marketingCommunications: boolean;   // Marketing communications consent
  };
}

/**
 * Authentication-specific user interface
 * JWT payload structure with enhanced security features
 */
export interface IUserAuth {
  userId: string;                       // User identifier for auth context
  email: string;                        // Email for authentication
  role: UserRole;                       // Role for authorization checks
  twoFactorEnabled: boolean;            // 2FA status for security flow
  sessionId: string;                    // Unique session identifier
}