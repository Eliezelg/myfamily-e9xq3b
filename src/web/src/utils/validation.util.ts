/**
 * Validation utilities for MyFamily web application
 * Implements secure form validation, content quality checks, and data integrity verification
 * with internationalization support and accessibility compliance
 * @version 1.0.0
 */

import * as yup from 'yup'; // v1.0.0
import i18next from 'i18next'; // v22.0.0
import memoizee from 'memoizee'; // v0.4.15
import {
  USER_VALIDATION,
  FAMILY_VALIDATION,
  CONTENT_VALIDATION,
  GAZETTE_VALIDATION,
  PAYMENT_VALIDATION,
  MAX_VALIDATION_TIMEOUT
} from '../constants/validation.constants';
import {
  ILoginCredentials,
  IRegisterData,
  IAuthResponse,
  IAuthUser,
  ITwoFactorVerification,
  IPasswordReset
} from '../interfaces/auth.interface';

// Global validation configuration
const VALIDATION_TIMEOUT = 5000;
const MAX_VALIDATION_ATTEMPTS = 3;

/**
 * Custom validation error class with i18n support
 */
export class ValidationError extends Error {
  public code: string;
  public context: Record<string, any>;

  constructor(messageKey: string, context: Record<string, any> = {}) {
    const message = i18next.t(messageKey, context);
    super(message);
    this.name = 'ValidationError';
    this.code = messageKey;
    this.context = context;
    Error.captureStackTrace(this, ValidationError);
  }
}

/**
 * Creates and memoizes validation schemas for better performance
 * @param schemaConfig Schema configuration object
 * @returns Memoized validation schema
 */
const createMemoizedSchema = memoizee(
  (schemaConfig: yup.Schema) => {
    return schemaConfig.clone()
      .meta({ 'aria-invalid': false })
      .meta({ 'aria-errormessage': '' });
  },
  { maxAge: 5000, max: 100 }
);

/**
 * Wraps validation functions with timeout protection
 * @param validationFn Validation function to execute
 * @param timeout Timeout duration in milliseconds
 * @returns Validation result or timeout error
 */
const validateWithTimeout = async <T>(
  validationFn: () => Promise<T>,
  timeout: number = VALIDATION_TIMEOUT
): Promise<T> => {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new ValidationError('validation.error.timeout'));
    }, timeout);
  });

  try {
    const result = await Promise.race([validationFn(), timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Validates login credentials with enhanced security
 * @param credentials Login credentials to validate
 * @returns Validated credentials
 */
export const validateLoginCredentials = async (
  credentials: ILoginCredentials
): Promise<ILoginCredentials> => {
  const schema = createMemoizedSchema(
    yup.object().shape({
      email: USER_VALIDATION.EMAIL,
      password: USER_VALIDATION.PASSWORD
    })
  );

  return validateWithTimeout(async () => {
    try {
      return await schema.validate(credentials, { abortEarly: false });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        throw new ValidationError('validation.login.invalid', {
          details: error.errors
        });
      }
      throw error;
    }
  });
};

/**
 * Validates registration data with sanitization
 * @param data Registration data to validate
 * @returns Validated registration data
 */
export const validateRegistrationData = async (
  data: IRegisterData
): Promise<IRegisterData> => {
  const schema = createMemoizedSchema(
    yup.object().shape({
      email: USER_VALIDATION.EMAIL,
      password: USER_VALIDATION.PASSWORD,
      firstName: USER_VALIDATION.NAME,
      lastName: USER_VALIDATION.NAME,
      language: yup.string().oneOf(
        ['en', 'he', 'ar', 'ru', 'fr', 'es', 'de', 'zh'],
        'validation.language.invalid'
      )
    })
  );

  return validateWithTimeout(async () => {
    try {
      return await schema.validate(data, { 
        abortEarly: false,
        stripUnknown: true
      });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        throw new ValidationError('validation.registration.invalid', {
          details: error.errors
        });
      }
      throw error;
    }
  });
};

/**
 * Validates family content with quality checks
 * @param content Family content data to validate
 * @returns Validated content data
 */
export const validateFamilyContent = async (
  content: { photos: File[]; text: string }
): Promise<{ photos: File[]; text: string }> => {
  const schema = createMemoizedSchema(
    yup.object().shape({
      photos: yup.array()
        .of(CONTENT_VALIDATION.PHOTO)
        .min(1, 'validation.content.photos.min')
        .max(GAZETTE_VALIDATION.PHOTO_COUNT),
      text: CONTENT_VALIDATION.TEXT
    })
  );

  return validateWithTimeout(async () => {
    try {
      return await schema.validate(content, { abortEarly: false });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        throw new ValidationError('validation.content.invalid', {
          details: error.errors
        });
      }
      throw error;
    }
  });
};

/**
 * Validates payment data with amount restrictions
 * @param payment Payment data to validate
 * @returns Validated payment data
 */
export const validatePaymentData = async (
  payment: { amount: number; poolBalance: number }
): Promise<{ amount: number; poolBalance: number }> => {
  const schema = createMemoizedSchema(
    yup.object().shape({
      amount: PAYMENT_VALIDATION.AMOUNT,
      poolBalance: PAYMENT_VALIDATION.POOL_BALANCE
    })
  );

  return validateWithTimeout(async () => {
    try {
      return await schema.validate(payment, { abortEarly: false });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        throw new ValidationError('validation.payment.invalid', {
          details: error.errors
        });
      }
      throw error;
    }
  });
};

/**
 * Validates two-factor authentication data
 * @param twoFactorData 2FA verification data
 * @returns Validated 2FA data
 */
export const validateTwoFactorVerification = async (
  twoFactorData: ITwoFactorVerification
): Promise<ITwoFactorVerification> => {
  const schema = createMemoizedSchema(
    yup.object().shape({
      userId: yup.string().uuid('validation.twoFactor.userId.invalid'),
      code: yup.string()
        .matches(/^\d{6}$/, 'validation.twoFactor.code.invalid')
    })
  );

  return validateWithTimeout(async () => {
    try {
      return await schema.validate(twoFactorData, { abortEarly: false });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        throw new ValidationError('validation.twoFactor.invalid', {
          details: error.errors
        });
      }
      throw error;
    }
  });
};

export {
  ValidationError,
  createMemoizedSchema,
  validateWithTimeout
};