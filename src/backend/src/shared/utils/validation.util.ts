/**
 * @fileoverview Core validation utilities for MyFamily platform
 * Implements comprehensive input validation, data sanitization, and error handling
 * with enhanced security features and GDPR compliance
 * Version: 1.0.0
 */

import { validate, ValidationError as ClassValidatorError } from 'class-validator'; // v0.14.0
import { plainToClass } from 'class-transformer'; // v0.5.1
import { isEmail } from 'validator'; // v13.7.0
import createDOMPurify from 'dompurify'; // v3.0.0
import { JSDOM } from 'jsdom';

import { ErrorCodes, ErrorMessages } from '../constants/error-codes';
import { IUser } from '../interfaces/user.interface';

// Initialize DOMPurify with JSDOM for server-side sanitization
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Interface for validation results with detailed error reporting
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  metadata?: Record<string, any>;
}

/**
 * Enhanced validation error class with detailed error reporting
 */
export class ValidationError extends Error {
  public readonly code: number;
  public readonly details: any[];
  public readonly metadata: Record<string, any>;

  constructor(message: string, details: any[] = [], metadata: Record<string, any> = {}) {
    super(message);
    this.name = 'ValidationError';
    this.code = ErrorCodes.VALIDATION_ERROR;
    this.details = details;
    this.metadata = metadata;
    Error.captureStackTrace(this, ValidationError);
  }
}

/**
 * Validates input data against a specified validation schema with enhanced security checks
 * @param data - Input data to validate
 * @param validationSchema - Class-validator decorated class
 * @returns Promise<ValidationResult>
 */
export async function validateInput(
  data: any,
  validationSchema: new () => any
): Promise<ValidationResult> {
  try {
    // Transform plain object to class instance
    const instance = plainToClass(validationSchema, data);

    // Run validation
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: { target: false }
    });

    if (errors.length > 0) {
      const formattedErrors = errors.map((error: ClassValidatorError) => 
        Object.values(error.constraints || {}).join(', ')
      );

      return {
        isValid: false,
        errors: formattedErrors,
        metadata: { validationSchema: validationSchema.name }
      };
    }

    return {
      isValid: true,
      errors: []
    };
  } catch (error) {
    throw new ValidationError(
      ErrorMessages[ErrorCodes.VALIDATION_ERROR],
      [],
      { originalError: error }
    );
  }
}

/**
 * Enhanced email validation with comprehensive security checks
 * @param email - Email address to validate
 * @returns Promise<ValidationResult>
 */
export async function validateEmail(email: string): Promise<ValidationResult> {
  const errors: string[] = [];

  // RFC 5322 compliant email regex
  const emailRegex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;

  if (!email || typeof email !== 'string') {
    errors.push('Email is required and must be a string');
  } else {
    // Basic format validation
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    // Additional validator library check
    if (!isEmail(email, { 
      allow_utf8_local_part: false,
      require_tld: true,
      allow_ip_domain: false
    })) {
      errors.push('Email address contains invalid characters or format');
    }

    // Length checks
    if (email.length > 254) {
      errors.push('Email address exceeds maximum length');
    }

    // Domain specific checks
    const [localPart, domain] = email.split('@');
    if (localPart && localPart.length > 64) {
      errors.push('Local part of email exceeds maximum length');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    metadata: { emailLength: email?.length }
  };
}

/**
 * Enhanced password validation with strength analysis
 * @param password - Password to validate
 * @returns ValidationResult
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  const strengthChecks = {
    hasMinLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  // Required checks
  if (!strengthChecks.hasMinLength) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!strengthChecks.hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!strengthChecks.hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!strengthChecks.hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!strengthChecks.hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  // Calculate strength score
  const strengthScore = Object.values(strengthChecks).filter(Boolean).length;

  return {
    isValid: errors.length === 0,
    errors,
    metadata: {
      strengthScore,
      strengthChecks
    }
  };
}

/**
 * Comprehensive input sanitization with multiple security layers
 * @param input - Input data to sanitize
 * @returns Sanitized input data
 */
export function sanitizeInput(input: any): any {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    // HTML sanitization
    let sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // Strip all HTML tags
      ALLOWED_ATTR: [], // Strip all attributes
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
      SANITIZE_DOM: true
    });

    // Additional string sanitization
    sanitized = sanitized
      .trim() // Remove leading/trailing whitespace
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '') // Restrict to printable ASCII and basic Latin-1
      .replace(/\s+/g, ' '); // Normalize whitespace

    return sanitized;
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }

  if (typeof input === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitizedObj[sanitizeInput(key)] = sanitizeInput(value);
    }
    return sanitizedObj;
  }

  return input;
}