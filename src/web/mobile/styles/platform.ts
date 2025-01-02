/**
 * @fileoverview Platform-specific styling configurations and utilities for React Native
 * Implements Material Design 3.0 specifications with iOS and Android support
 * @version 1.0.0
 * @package MyFamily Mobile
 */

import { StyleSheet, Platform, PlatformColor } from 'react-native'; // v0.71+
import { isIOS, isAndroid, getPlatformVersion } from '../utils/platform.util';

// Global style constants
const SHADOW_COLOR = '#000000';
const INPUT_HEIGHT = 48;
const BORDER_RADIUS = 8;
const PLATFORM_STYLE_VERSION = 1;
const DEBUG_STYLE = false;

// TypeScript interfaces for style configurations
interface ElevationOptions {
  color?: string;
  opacity?: number;
  radius?: number;
}

interface PlatformStyleConfig {
  ios: object;
  android: object;
  common?: object;
}

/**
 * Generates platform-specific elevation/shadow styles
 * @param {number} elevation - Material Design elevation level (1-24)
 * @param {ElevationOptions} options - Custom elevation options
 * @returns {StyleSheet.NamedStyles} Platform-specific elevation styles
 */
export const getPlatformElevation = (elevation: number, options: ElevationOptions = {}): any => {
  try {
    // Validate elevation input
    const validElevation = Math.min(Math.max(elevation, 1), 24);
    const platformVersion = getPlatformVersion();

    if (isIOS()) {
      // iOS-specific shadow implementation
      const shadowOpacity = options.opacity || (0.2 + (validElevation / 100));
      const shadowRadius = options.radius || (validElevation * 0.75);
      
      return {
        shadowColor: options.color || SHADOW_COLOR,
        shadowOffset: {
          width: 0,
          height: validElevation / 2,
        },
        shadowOpacity,
        shadowRadius,
      };
    }

    if (isAndroid()) {
      // Android-specific elevation with version check
      return {
        elevation: validElevation,
        ...(parseInt(platformVersion) >= 28 && {
          outlineProvider: 'background',
          androidElevation: validElevation,
        }),
      };
    }

    return {};
  } catch (error) {
    console.error('Error generating platform elevation:', error);
    return {};
  }
};

/**
 * Creates memoized platform-specific styles with performance optimization
 * @param {PlatformStyleConfig} styleConfig - Platform-specific style configuration
 * @returns {StyleSheet.NamedStyles} Memoized platform-specific styles
 */
export const createPlatformStyle = (styleConfig: PlatformStyleConfig): any => {
  try {
    const { ios, android, common = {} } = styleConfig;

    const platformStyles = Platform.select({
      ios: StyleSheet.create({ ...common, ...ios }),
      android: StyleSheet.create({ ...common, ...android }),
    });

    return platformStyles || StyleSheet.create(common);
  } catch (error) {
    console.error('Error creating platform style:', error);
    return StyleSheet.create({});
  }
};

/**
 * Platform-specific style configurations
 */
export const platformStyles = {
  // Shadow and elevation styles
  shadow: createPlatformStyle({
    ios: {
      shadowColor: SHADOW_COLOR,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    android: {
      elevation: 5,
    },
    common: {
      backgroundColor: '#FFFFFF',
    },
  }),

  // Input field styles
  input: createPlatformStyle({
    ios: {
      height: INPUT_HEIGHT,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: PlatformColor('systemGray4'),
      borderRadius: BORDER_RADIUS,
    },
    android: {
      height: INPUT_HEIGHT,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: PlatformColor('?android:attr/textColorSecondary'),
    },
    common: {
      fontSize: 16,
    },
  }),

  // Typography styles
  typography: createPlatformStyle({
    ios: {
      fontFamily: 'System',
      title: {
        fontSize: 20,
        fontWeight: '600',
      },
      body: {
        fontSize: 16,
        fontWeight: '400',
      },
    },
    android: {
      fontFamily: 'Roboto',
      title: {
        fontSize: 20,
        fontWeight: '500',
      },
      body: {
        fontSize: 16,
        fontWeight: '400',
      },
    },
  }),

  // Elevation styles for different levels
  elevation: {
    low: getPlatformElevation(2),
    medium: getPlatformElevation(4),
    high: getPlatformElevation(8),
    modal: getPlatformElevation(16),
  },
};

// Enable style debugging in development
if (__DEV__ && DEBUG_STYLE) {
  console.log('Platform Styles Version:', PLATFORM_STYLE_VERSION);
  console.log('Platform Styles:', platformStyles);
}