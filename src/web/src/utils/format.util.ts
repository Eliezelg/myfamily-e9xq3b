// External imports with versions
import { formatNumber as intlFormatNumber, formatCurrency as intlFormatCurrency } from 'intl-number-format'; // ^1.0.0
import { memoize } from 'lodash'; // ^4.17.21
import { formatDate, formatDateTime } from './date.util';

// Global constants
export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'ILS'] as const;
export const MAX_DECIMAL_PLACES = 2;
export const TEXT_TRUNCATE_LENGTH = 100;
export const CURRENCY_DISPLAY_STYLE: Record<string, 'symbol'> = {
  USD: 'symbol',
  EUR: 'symbol',
  ILS: 'symbol'
};
export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

// Types
type Currency = typeof SUPPORTED_CURRENCIES[number];
type FileUnit = typeof FILE_SIZE_UNITS[number];

/**
 * Formats monetary values according to specified currency and locale with RTL support
 * @param amount The monetary amount to format
 * @param currency The currency code (USD, EUR, ILS)
 * @param locale The locale string for formatting
 * @returns Formatted currency string with proper directionality
 */
export const formatCurrency = memoize((
  amount: number,
  currency: Currency = 'USD',
  locale: string = DEFAULT_LOCALE
): string => {
  if (!Number.isFinite(amount)) {
    return '';
  }

  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  try {
    const isRTL = ['he', 'ar'].includes(locale);
    const options = {
      style: 'currency',
      currency,
      currencyDisplay: CURRENCY_DISPLAY_STYLE[currency],
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    };

    const formatted = intlFormatCurrency(amount, locale, options);
    return isRTL ? `\u200F${formatted}\u200F` : formatted;
  } catch (error) {
    console.error('Currency formatting error:', error);
    return '';
  }
});

/**
 * Formats numbers with locale-specific separators and decimal places
 * @param value The number to format
 * @param decimalPlaces Number of decimal places (max 2)
 * @param locale The locale string for formatting
 * @returns Formatted number string with proper directionality
 */
export const formatNumber = memoize((
  value: number,
  decimalPlaces: number = MAX_DECIMAL_PLACES,
  locale: string = DEFAULT_LOCALE
): string => {
  if (!Number.isFinite(value)) {
    return '';
  }

  try {
    const isRTL = ['he', 'ar'].includes(locale);
    const clampedDecimals = Math.min(Math.max(0, decimalPlaces), MAX_DECIMAL_PLACES);
    
    const options = {
      minimumFractionDigits: clampedDecimals,
      maximumFractionDigits: clampedDecimals,
      useGrouping: true
    };

    const formatted = intlFormatNumber(value, locale, options);
    return isRTL ? `\u200F${formatted}\u200F` : formatted;
  } catch (error) {
    console.error('Number formatting error:', error);
    return '';
  }
});

/**
 * Formats number as percentage with locale-specific formatting
 * @param value The decimal value to format as percentage
 * @param locale The locale string for formatting
 * @returns Formatted percentage string with proper directionality
 */
export const formatPercentage = memoize((
  value: number,
  locale: string = DEFAULT_LOCALE
): string => {
  if (!Number.isFinite(value)) {
    return '';
  }

  try {
    const isRTL = ['he', 'ar'].includes(locale);
    const options = {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    };

    const formatted = intlFormatNumber(value, locale, options);
    return isRTL ? `\u200F${formatted}\u200F` : formatted;
  } catch (error) {
    console.error('Percentage formatting error:', error);
    return '';
  }
});

/**
 * Truncates text to specified length with ellipsis, preserving RTL integrity
 * @param text The text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (
  text: string,
  maxLength: number = TEXT_TRUNCATE_LENGTH
): string => {
  if (typeof text !== 'string' || maxLength <= 0) {
    return '';
  }

  try {
    const hasRTLMarkers = text.startsWith('\u200F');
    const cleanText = text.replace(/[\u200E\u200F]/g, '');

    if (cleanText.length <= maxLength) {
      return text;
    }

    const truncated = `${cleanText.slice(0, maxLength)}...`;
    return hasRTLMarkers ? `\u200F${truncated}\u200F` : truncated;
  } catch (error) {
    console.error('Text truncation error:', error);
    return text;
  }
});

/**
 * Formats file size in bytes to human readable format
 * @param bytes File size in bytes
 * @param locale The locale string for number formatting
 * @returns Formatted file size string with appropriate unit
 */
export const formatFileSize = memoize((
  bytes: number,
  locale: string = DEFAULT_LOCALE
): string => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '';
  }

  try {
    const isRTL = ['he', 'ar'].includes(locale);
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    const formattedValue = formatNumber(value, value >= 100 ? 0 : 1, locale);
    const unit = FILE_SIZE_UNITS[unitIndex];
    const formatted = `${formattedValue} ${unit}`;

    return isRTL ? `\u200F${formatted}\u200F` : formatted;
  } catch (error) {
    console.error('File size formatting error:', error);
    return '';
  }
});

// Re-export date formatting functions for convenience
export { formatDate, formatDateTime };