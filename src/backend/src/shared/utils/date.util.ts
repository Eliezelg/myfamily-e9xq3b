/**
 * @fileoverview Comprehensive date utility module for multi-calendar system integration
 * and gazette scheduling with cultural sensitivity
 * @version 1.0.0
 */

// External imports
// date-fns@2.30.0 - Core date manipulation utilities
import { format, addMonths, isValid } from 'date-fns';
// date-fns-tz@2.0.0 - Timezone handling
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
// @hebcal/core@3.0.0 - Hebrew calendar integration
import { HebrewCalendar, HDate } from '@hebcal/core';

// Internal imports
import { Gazette } from '../interfaces/gazette.interface';

// Global constants
export const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';
export const DEFAULT_TIMEZONE = 'Asia/Jerusalem';
export const GAZETTE_FREQUENCY_MONTHLY = 'monthly';
export const MAX_DATE_RANGE_DAYS = 365;

/**
 * Error messages for date operations
 */
const ERROR_MESSAGES = {
  INVALID_DATE: 'Invalid date provided',
  INVALID_FORMAT: 'Invalid format string',
  INVALID_TIMEZONE: 'Invalid timezone specified',
  INVALID_RANGE: 'Invalid date range',
  RANGE_TOO_LARGE: 'Date range exceeds maximum allowed days'
} as const;

/**
 * Interface for Hebrew date conversion result
 */
interface HebrewDateResult {
  year: number;
  month: string;
  day: number;
  holidays: string[];
  isHebrewLeapYear: boolean;
}

/**
 * Formats a date with timezone awareness and locale support
 * @param date The date to format
 * @param formatString Custom format string (defaults to DEFAULT_DATE_FORMAT)
 * @param locale Locale string for formatting
 * @param timezone Target timezone (defaults to DEFAULT_TIMEZONE)
 * @returns Formatted date string
 * @throws Error if date is invalid or timezone is unsupported
 */
export function formatDate(
  date: Date,
  formatString: string = DEFAULT_DATE_FORMAT,
  locale: string = 'en-US',
  timezone: string = DEFAULT_TIMEZONE
): string {
  if (!date || !isValid(date)) {
    throw new Error(ERROR_MESSAGES.INVALID_DATE);
  }

  try {
    const zonedDate = utcToZonedTime(date, timezone);
    return format(zonedDate, formatString, {
      locale: require(`date-fns/locale/${locale}`),
      useAdditionalDayOfYearTokens: true
    });
  } catch (error) {
    throw new Error(`${ERROR_MESSAGES.INVALID_FORMAT}: ${error.message}`);
  }
}

/**
 * Converts a Gregorian date to Hebrew calendar date with holiday awareness
 * @param gregorianDate Gregorian calendar date
 * @param includeHolidays Whether to include holiday information
 * @returns Hebrew date information including holidays if requested
 * @throws Error if date is invalid
 */
export function convertToHebrewDate(
  gregorianDate: Date,
  includeHolidays: boolean = true
): HebrewDateResult {
  if (!isValid(gregorianDate)) {
    throw new Error(ERROR_MESSAGES.INVALID_DATE);
  }

  const hDate = new HDate(gregorianDate);
  const result: HebrewDateResult = {
    year: hDate.getFullYear(),
    month: hDate.getMonthName(),
    day: hDate.getDate(),
    holidays: [],
    isHebrewLeapYear: HebrewCalendar.isLeapYear(hDate.getFullYear())
  };

  if (includeHolidays) {
    result.holidays = HebrewCalendar.getHolidaysForDate(hDate)
      .map(holiday => holiday.getDesc('en'));
  }

  return result;
}

/**
 * Calculates the next gazette date considering holidays and cultural factors
 * @param currentDate Current reference date
 * @param frequency Gazette frequency (defaults to monthly)
 * @param timezone Target timezone
 * @returns Next valid gazette generation date
 * @throws Error if date or frequency is invalid
 */
export function getNextGazetteDate(
  currentDate: Date,
  frequency: string = GAZETTE_FREQUENCY_MONTHLY,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  if (!isValid(currentDate)) {
    throw new Error(ERROR_MESSAGES.INVALID_DATE);
  }

  const zonedDate = utcToZonedTime(currentDate, timezone);
  let nextDate = addMonths(zonedDate, 1);

  // Check for holidays and adjust if needed
  const hebrewDate = new HDate(nextDate);
  const holidays = HebrewCalendar.getHolidaysForDate(hebrewDate);

  // Adjust date if it falls on a major holiday
  if (holidays.some(holiday => holiday.getFlags() & HebrewCalendar.FLAGS.MAJOR_HOLIDAY)) {
    nextDate = addMonths(nextDate, 1);
  }

  return zonedTimeToUtc(nextDate, timezone);
}

/**
 * Validates a date range with timezone normalization
 * @param startDate Range start date
 * @param endDate Range end date
 * @param timezone Timezone for comparison
 * @returns Boolean indicating if range is valid
 * @throws Error if dates are invalid or range exceeds maximum
 */
export function isValidDateRange(
  startDate: Date,
  endDate: Date,
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  if (!isValid(startDate) || !isValid(endDate)) {
    throw new Error(ERROR_MESSAGES.INVALID_DATE);
  }

  const zonedStartDate = utcToZonedTime(startDate, timezone);
  const zonedEndDate = utcToZonedTime(endDate, timezone);

  if (zonedEndDate <= zonedStartDate) {
    throw new Error(ERROR_MESSAGES.INVALID_RANGE);
  }

  const daysDifference = Math.ceil(
    (zonedEndDate.getTime() - zonedStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDifference > MAX_DATE_RANGE_DAYS) {
    throw new Error(ERROR_MESSAGES.RANGE_TOO_LARGE);
  }

  return true;
}

/**
 * Helper function to normalize timezone-aware dates
 * @param date Date to normalize
 * @param timezone Target timezone
 * @returns Normalized Date object
 * @private
 */
function normalizeDate(date: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  if (!isValid(date)) {
    throw new Error(ERROR_MESSAGES.INVALID_DATE);
  }
  return zonedTimeToUtc(utcToZonedTime(date, timezone), timezone);
}