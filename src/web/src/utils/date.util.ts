// External imports with versions
import { format, isValid, parse, differenceInDays, addMonths } from 'date-fns'; // ^2.30.0
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'; // ^2.0.0
import { HebrewCalendar, HDate } from '@hebcal/core'; // ^3.0.0
import { HijriDate } from 'hijri-date'; // ^1.2.1
import { ChineseCalendar } from 'chinese-calendar'; // ^1.0.0

// Global constants
export const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';
export const DEFAULT_TIME_FORMAT = 'HH:mm';
export const DEFAULT_TIMEZONE = 'Asia/Jerusalem';
export const SUPPORTED_LOCALES = ['en', 'he', 'ar', 'ru', 'fr', 'es', 'de', 'zh'];
export const CALENDAR_TYPES = {
  GREGORIAN: 'gregorian',
  HEBREW: 'hebrew',
  ISLAMIC: 'islamic',
  CHINESE: 'chinese'
} as const;
export const MAX_DATE_RANGE_DAYS = 365;

// Types
type CalendarType = typeof CALENDAR_TYPES[keyof typeof CALENDAR_TYPES];

interface HebrewDateResult {
  year: number;
  month: string;
  day: number;
  isHoliday?: boolean;
  holidayName?: string;
}

interface IslamicDateResult {
  year: number;
  month: string;
  day: number;
  isHoliday?: boolean;
  holidayName?: string;
}

interface ChineseDateResult {
  year: number;
  month: number;
  day: number;
  zodiac: string;
  festival?: string;
}

interface HolidayResult {
  exists: boolean;
  name?: string;
  type?: string;
  calendarType: CalendarType;
}

/**
 * Formats a date according to specified locale and format string
 * @param date The date to format
 * @param formatString Optional custom format string
 * @param locale Optional locale string from SUPPORTED_LOCALES
 * @returns Formatted date string according to locale
 */
export const formatDate = (
  date: Date,
  formatString: string = DEFAULT_DATE_FORMAT,
  locale: string = 'en'
): string => {
  if (!isValid(date) || !SUPPORTED_LOCALES.includes(locale)) {
    return '';
  }

  try {
    return format(date, formatString, { locale: require(`date-fns/locale/${locale}`) });
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
};

/**
 * Formats a date with time according to specified locale
 * @param date The date to format
 * @param locale Optional locale string from SUPPORTED_LOCALES
 * @returns Formatted date and time string
 */
export const formatDateTime = (
  date: Date,
  locale: string = 'en'
): string => {
  if (!isValid(date) || !SUPPORTED_LOCALES.includes(locale)) {
    return '';
  }

  const formatString = `${DEFAULT_DATE_FORMAT} ${DEFAULT_TIME_FORMAT}`;
  try {
    return format(date, formatString, { locale: require(`date-fns/locale/${locale}`) });
  } catch (error) {
    console.error('DateTime formatting error:', error);
    return '';
  }
};

/**
 * Converts Gregorian date to Hebrew calendar date
 * @param gregorianDate The Gregorian date to convert
 * @returns Hebrew date object with year, month, day and holiday information
 */
export const convertToHebrewDate = (gregorianDate: Date): HebrewDateResult => {
  if (!isValid(gregorianDate)) {
    throw new Error('Invalid Gregorian date provided');
  }

  try {
    const hDate = new HDate(gregorianDate);
    const holidays = HebrewCalendar.getHolidaysOnDate(hDate);

    return {
      year: hDate.getFullYear(),
      month: hDate.getMonthName(),
      day: hDate.getDate(),
      isHoliday: holidays.length > 0,
      holidayName: holidays[0]?.render('en') // Get first holiday if exists
    };
  } catch (error) {
    console.error('Hebrew date conversion error:', error);
    throw error;
  }
};

/**
 * Converts Gregorian date to Islamic Hijri calendar date
 * @param gregorianDate The Gregorian date to convert
 * @returns Islamic date object with year, month, day
 */
export const convertToIslamicDate = (gregorianDate: Date): IslamicDateResult => {
  if (!isValid(gregorianDate)) {
    throw new Error('Invalid Gregorian date provided');
  }

  try {
    const hijriDate = new HijriDate(gregorianDate);
    return {
      year: hijriDate.getFullYear(),
      month: hijriDate.getMonthName(),
      day: hijriDate.getDate(),
      isHoliday: hijriDate.isHoliday(),
      holidayName: hijriDate.getHolidayName()
    };
  } catch (error) {
    console.error('Islamic date conversion error:', error);
    throw error;
  }
};

/**
 * Converts Gregorian date to Chinese lunar calendar date
 * @param gregorianDate The Gregorian date to convert
 * @returns Chinese calendar date with year, month, day, and festival information
 */
export const convertToChineseDate = (gregorianDate: Date): ChineseDateResult => {
  if (!isValid(gregorianDate)) {
    throw new Error('Invalid Gregorian date provided');
  }

  try {
    const chineseDate = new ChineseCalendar(gregorianDate);
    return {
      year: chineseDate.getYear(),
      month: chineseDate.getMonth(),
      day: chineseDate.getDay(),
      zodiac: chineseDate.getZodiac(),
      festival: chineseDate.getFestival()
    };
  } catch (error) {
    console.error('Chinese date conversion error:', error);
    throw error;
  }
};

/**
 * Checks if a given date is a holiday in specified calendar system
 * @param date The date to check
 * @param calendarType The calendar system to check against
 * @param locale Optional locale for holiday names
 * @returns Holiday information including name and type
 */
export const isHoliday = (
  date: Date,
  calendarType: CalendarType,
  locale: string = 'en'
): HolidayResult => {
  if (!isValid(date) || !SUPPORTED_LOCALES.includes(locale)) {
    throw new Error('Invalid date or unsupported locale');
  }

  try {
    switch (calendarType) {
      case CALENDAR_TYPES.HEBREW: {
        const hebrewDate = convertToHebrewDate(date);
        return {
          exists: hebrewDate.isHoliday || false,
          name: hebrewDate.holidayName,
          type: 'religious',
          calendarType: CALENDAR_TYPES.HEBREW
        };
      }
      case CALENDAR_TYPES.ISLAMIC: {
        const islamicDate = convertToIslamicDate(date);
        return {
          exists: islamicDate.isHoliday || false,
          name: islamicDate.holidayName,
          type: 'religious',
          calendarType: CALENDAR_TYPES.ISLAMIC
        };
      }
      case CALENDAR_TYPES.CHINESE: {
        const chineseDate = convertToChineseDate(date);
        return {
          exists: !!chineseDate.festival,
          name: chineseDate.festival,
          type: 'traditional',
          calendarType: CALENDAR_TYPES.CHINESE
        };
      }
      default:
        return {
          exists: false,
          calendarType: CALENDAR_TYPES.GREGORIAN
        };
    }
  } catch (error) {
    console.error('Holiday check error:', error);
    throw error;
  }
};

/**
 * Converts date to specified timezone with DST awareness
 * @param date The date to convert
 * @param timezone Target timezone (IANA timezone identifier)
 * @returns Date object in specified timezone
 */
export const getTimezonedDate = (
  date: Date,
  timezone: string = DEFAULT_TIMEZONE
): Date => {
  if (!isValid(date)) {
    throw new Error('Invalid date provided');
  }

  try {
    const utcDate = zonedTimeToUtc(date, timezone);
    return utcToZonedTime(utcDate, timezone);
  } catch (error) {
    console.error('Timezone conversion error:', error);
    throw error;
  }
};