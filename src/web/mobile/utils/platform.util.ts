/**
 * @fileoverview Platform utility functions for React Native mobile application
 * Platform-specific detection, behavior and styling with TypeScript support
 * @version 1.0.0
 * @package MyFamily Mobile
 */

import { Platform } from 'react-native'; // v0.71+

// Platform constants with type safety
const PLATFORM_CONSTANTS = {
  IOS: 'ios' as const,
  ANDROID: 'android' as const
} as const;

// Type definitions
type PlatformOS = typeof PLATFORM_CONSTANTS[keyof typeof PLATFORM_CONSTANTS];
type PlatformVersion = string | number;

/**
 * TypeScript interface for platform selection options
 */
export interface PlatformSelectOptions<T> {
  ios: T;
  android: T;
  default?: T;
}

/**
 * Cache storage for memoized functions
 */
const memoCache = new Map<string, any>();

/**
 * Memoization decorator factory
 */
function memoized(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function(...args: any[]) {
    const cacheKey = `${propertyKey}:${args.join(',')}`;
    if (memoCache.has(cacheKey)) {
      return memoCache.get(cacheKey);
    }
    const result = originalMethod.apply(this, args);
    memoCache.set(cacheKey, result);
    return result;
  };
  return descriptor;
}

/**
 * Checks if the current platform is iOS
 * @returns {boolean} True if platform is iOS, false otherwise
 */
@memoized
export function isIOS(): boolean {
  try {
    return Platform.OS === PLATFORM_CONSTANTS.IOS;
  } catch (error) {
    console.error('Error detecting iOS platform:', error);
    return false;
  }
}

/**
 * Checks if the current platform is Android
 * @returns {boolean} True if platform is Android, false otherwise
 */
@memoized
export function isAndroid(): boolean {
  try {
    return Platform.OS === PLATFORM_CONSTANTS.ANDROID;
  } catch (error) {
    console.error('Error detecting Android platform:', error);
    return false;
  }
}

/**
 * Gets the current platform version number
 * @returns {string} Platform version number
 * @throws {Error} If platform version cannot be determined
 */
export function getPlatformVersion(): string {
  try {
    const version = Platform.Version;
    if (typeof version === 'number') {
      return version.toString();
    }
    if (typeof version === 'string') {
      return version;
    }
    throw new Error('Invalid platform version format');
  } catch (error) {
    console.error('Error getting platform version:', error);
    throw error;
  }
}

/**
 * Type-safe selector for platform-specific values
 * @template T The type of the platform-specific value
 * @param {PlatformSelectOptions<T>} options Platform-specific options
 * @returns {T} Platform-specific value
 * @throws {Error} If platform is unsupported or options are invalid
 */
export function getPlatformSelect<T>(options: PlatformSelectOptions<T>): T {
  try {
    // Validate options
    if (!options || typeof options !== 'object') {
      throw new Error('Invalid platform select options');
    }

    // Check required platform values
    if (!('ios' in options) || !('android' in options)) {
      throw new Error('Missing required platform values');
    }

    // Use Platform.select with type safety
    const selected = Platform.select({
      ios: options.ios,
      android: options.android,
      default: options.default
    });

    // Handle potential missing platform values
    if (selected === undefined) {
      if (options.default !== undefined) {
        return options.default;
      }
      throw new Error('Unsupported platform and no default value provided');
    }

    return selected as T;
  } catch (error) {
    console.error('Error in platform select:', error);
    throw error;
  }
}

// Type guard for platform OS
export function isPlatformOS(value: string): value is PlatformOS {
  return Object.values(PLATFORM_CONSTANTS).includes(value as PlatformOS);
}

// Export platform constants for external use
export const PLATFORM = {
  ...PLATFORM_CONSTANTS,
  VERSION: getPlatformVersion(),
  OS: Platform.OS as PlatformOS
} as const;