// yup validation library v1.0.0
import * as yup from 'yup';

// Regular expressions for validation
export const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Global validation constants
export const PASSWORD_MIN_LENGTH = 8;
export const MAX_FAMILY_NAME_LENGTH = 50;
export const MAX_FAMILY_MEMBERS = 20;
export const MIN_PHOTO_WIDTH = 1200;
export const MIN_PHOTO_HEIGHT = 800;
export const MAX_FILE_SIZE = 10485760; // 10MB in bytes
export const MAX_PHOTOS_PER_GAZETTE = 28;
export const MAX_TEXT_LENGTH = 500;
export const MIN_PAYMENT_AMOUNT = 10;
export const MAX_PAYMENT_AMOUNT = 1000;
export const MAX_VALIDATION_TIMEOUT = 5000;

export const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png'] as const;
export const SUPPORTED_LANGUAGES = ['en', 'he', 'ar', 'ru', 'fr', 'es', 'de', 'zh'] as const;

// Memoized validation schema creation functions
export const createEmailValidation = (locale: string): yup.StringSchema => {
  return yup.string()
    .required({ key: 'validation.email.required', locale })
    .matches(EMAIL_REGEX, { message: { key: 'validation.email.invalid', locale } })
    .max(254, { key: 'validation.email.maxLength', locale }) // RFC 5321
    .trim()
    .lowercase()
    .meta({ 'aria-label': 'Email input field' });
};

export const createPasswordValidation = (locale: string): yup.StringSchema => {
  return yup.string()
    .required({ key: 'validation.password.required', locale })
    .min(PASSWORD_MIN_LENGTH, { key: 'validation.password.minLength', locale })
    .matches(PASSWORD_REGEX, { message: { key: 'validation.password.complexity', locale } })
    .max(128, { key: 'validation.password.maxLength', locale })
    .meta({ 'aria-label': 'Password input field' });
};

export const createPhotoValidation = (locale: string): yup.MixedSchema => {
  return yup.mixed()
    .required({ key: 'validation.photo.required', locale })
    .test('fileType', { key: 'validation.photo.type', locale }, 
      value => value && SUPPORTED_MIME_TYPES.includes(value.type))
    .test('fileSize', { key: 'validation.photo.size', locale },
      value => value && value.size <= MAX_FILE_SIZE)
    .test('dimensions', { key: 'validation.photo.dimensions', locale },
      async value => {
        if (!value) return false;
        const image = new Image();
        image.src = URL.createObjectURL(value);
        await new Promise(resolve => image.onload = resolve);
        return image.width >= MIN_PHOTO_WIDTH && image.height >= MIN_PHOTO_HEIGHT;
      })
    .meta({ 'aria-label': 'Photo upload field' });
};

// User validation schemas
export const USER_VALIDATION = {
  EMAIL: createEmailValidation('en'),
  PASSWORD: createPasswordValidation('en'),
  NAME: yup.string()
    .required({ key: 'validation.name.required', locale: 'en' })
    .min(2, { key: 'validation.name.minLength', locale: 'en' })
    .max(50, { key: 'validation.name.maxLength', locale: 'en' })
    .matches(/^[a-zA-Z\s-']+$/, { message: { key: 'validation.name.format', locale: 'en' } })
} as const;

// Family validation schemas
export const FAMILY_VALIDATION = {
  NAME: yup.string()
    .required({ key: 'validation.family.name.required', locale: 'en' })
    .max(MAX_FAMILY_NAME_LENGTH, { key: 'validation.family.name.maxLength', locale: 'en' })
    .matches(/^[\p{L}\s-']+$/u, { message: { key: 'validation.family.name.format', locale: 'en' } }),
  MEMBER_COUNT: yup.number()
    .required({ key: 'validation.family.members.required', locale: 'en' })
    .min(1, { key: 'validation.family.members.min', locale: 'en' })
    .max(MAX_FAMILY_MEMBERS, { key: 'validation.family.members.max', locale: 'en' })
} as const;

// Content validation schemas
export const CONTENT_VALIDATION = {
  PHOTO: createPhotoValidation('en'),
  TEXT: yup.string()
    .required({ key: 'validation.content.text.required', locale: 'en' })
    .max(MAX_TEXT_LENGTH, { key: 'validation.content.text.maxLength', locale: 'en' })
    .trim()
} as const;

// Gazette validation schemas
export const GAZETTE_VALIDATION = {
  PHOTO_COUNT: yup.number()
    .required({ key: 'validation.gazette.photos.required', locale: 'en' })
    .min(1, { key: 'validation.gazette.photos.min', locale: 'en' })
    .max(MAX_PHOTOS_PER_GAZETTE, { key: 'validation.gazette.photos.max', locale: 'en' }),
  TEXT_LENGTH: yup.number()
    .required({ key: 'validation.gazette.text.required', locale: 'en' })
    .max(MAX_TEXT_LENGTH, { key: 'validation.gazette.text.maxLength', locale: 'en' })
} as const;

// Payment validation schemas
export const PAYMENT_VALIDATION = {
  AMOUNT: yup.number()
    .required({ key: 'validation.payment.amount.required', locale: 'en' })
    .min(MIN_PAYMENT_AMOUNT, { key: 'validation.payment.amount.min', locale: 'en' })
    .max(MAX_PAYMENT_AMOUNT, { key: 'validation.payment.amount.max', locale: 'en' })
    .test('decimals', { key: 'validation.payment.amount.decimals', locale: 'en' },
      value => value ? Number.isInteger(value * 100) : true),
  POOL_BALANCE: yup.number()
    .required({ key: 'validation.payment.pool.required', locale: 'en' })
    .min(0, { key: 'validation.payment.pool.min', locale: 'en' })
} as const;