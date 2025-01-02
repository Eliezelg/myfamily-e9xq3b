/**
 * @fileoverview Standardized error codes and messages for MyFamily platform
 * Provides consistent error handling across all backend microservices
 * Version: 1.0.0
 */

/**
 * Prefix for all MyFamily platform error codes
 * Used for error tracking and logging
 */
export const ERROR_CODE_PREFIX = 'MF';

/**
 * Enumeration of all error codes used across the platform
 * Organized by domain and functionality
 * Range 4000-4999: Client/Business errors
 * Range 5000-5999: Server errors
 */
export enum ErrorCodes {
  // System-level errors (5000-5999)
  INTERNAL_SERVER_ERROR = 5000,

  // Authentication & Authorization errors (4000-4009)
  VALIDATION_ERROR = 4000,
  AUTHENTICATION_ERROR = 4001,
  AUTHORIZATION_ERROR = 4003,
  RESOURCE_NOT_FOUND = 4004,
  DUPLICATE_RESOURCE = 4009,

  // Payment & Financial errors (4010-4019)
  PAYMENT_ERROR = 4010,
  FAMILY_POOL_INSUFFICIENT_FUNDS = 4011,

  // Content & Generation errors (4020-4029)
  CONTENT_PROCESSING_ERROR = 4020,
  IMAGE_QUALITY_ERROR = 4021,
  GAZETTE_GENERATION_ERROR = 4022,
  PRINT_SERVICE_ERROR = 4023
}

/**
 * User-friendly error messages corresponding to error codes
 * Supports internationalization and maintains consistent messaging
 * Messages are designed to be helpful while not exposing sensitive information
 */
export const ErrorMessages = {
  // System-level error messages
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred. Please try again later or contact support.',

  // Authentication & Authorization error messages
  [ErrorCodes.VALIDATION_ERROR]: 'The provided information is invalid. Please check your input and try again.',
  [ErrorCodes.AUTHENTICATION_ERROR]: 'Unable to verify your identity. Please sign in again.',
  [ErrorCodes.AUTHORIZATION_ERROR]: "You don't have permission to perform this action.",
  [ErrorCodes.RESOURCE_NOT_FOUND]: 'The requested item could not be found.',
  [ErrorCodes.DUPLICATE_RESOURCE]: 'This item already exists in the system.',

  // Payment & Financial error messages
  [ErrorCodes.PAYMENT_ERROR]: 'Unable to process your payment. Please verify your payment information.',
  [ErrorCodes.FAMILY_POOL_INSUFFICIENT_FUNDS]: 'Your family pool has insufficient funds for this operation.',

  // Content & Generation error messages
  [ErrorCodes.CONTENT_PROCESSING_ERROR]: 'Unable to process your content. Please try again or use a different file.',
  [ErrorCodes.IMAGE_QUALITY_ERROR]: 'The image quality is too low for print. Please upload a higher resolution image.',
  [ErrorCodes.GAZETTE_GENERATION_ERROR]: 'Unable to generate your gazette. Please contact support.',
  [ErrorCodes.PRINT_SERVICE_ERROR]: 'Unable to process your print request. Please try again later.'
} as const;

/**
 * Type to ensure error messages correspond to valid error codes
 */
type ErrorMessageType = {
  readonly [K in ErrorCodes]: string;
};

// Type assertion to ensure ErrorMessages matches ErrorMessageType
const _typeCheck: ErrorMessageType = ErrorMessages;