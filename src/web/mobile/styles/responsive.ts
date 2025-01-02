import { StyleSheet, PixelRatio, Platform, Dimensions } from 'react-native'; // react-native@0.71+
import { memoize } from 'lodash'; // lodash@4.17+
import { 
  getScreenWidth, 
  getScreenHeight, 
  isTablet, 
  getPixelDensity 
} from '../utils/dimensions.util';

// Design constants based on standard iPhone X dimensions
const DESIGN_WIDTH = 375;
const DESIGN_HEIGHT = 812;
const SCALE_FACTOR = 0.5;
const TABLET_SCALE_FACTOR = 0.3;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.2;

/**
 * Memoized horizontal scaling function that adapts dimensions based on screen width
 * @param size - Original size in pixels
 * @param shouldCompensatePixelRatio - Whether to apply pixel density compensation
 * @returns Scaled size value
 */
export const scale = memoize((size: number, shouldCompensatePixelRatio: boolean = true): number => {
  const screenWidth = getScreenWidth();
  const scaleFactor = screenWidth / DESIGN_WIDTH;
  
  let scaledValue = size * scaleFactor;
  
  if (shouldCompensatePixelRatio) {
    const pixelDensity = getPixelDensity();
    scaledValue = scaledValue / pixelDensity;
  }
  
  return Math.round(scaledValue);
});

/**
 * Memoized vertical scaling function for height-based dimensions
 * @param size - Original size in pixels
 * @returns Vertically scaled size value
 */
export const verticalScale = memoize((size: number): number => {
  const screenHeight = getScreenHeight();
  const scaleFactor = screenHeight / DESIGN_HEIGHT;
  return Math.round(size * scaleFactor);
});

/**
 * Enhanced moderated scaling with tablet and accessibility support
 * @param size - Original size in pixels
 * @param factor - Optional moderation factor
 * @param includeAccessibility - Whether to include accessibility scaling
 * @returns Moderated scale value
 */
export const moderateScale = memoize((
  size: number, 
  factor: number = SCALE_FACTOR,
  includeAccessibility: boolean = true
): number => {
  const baseScale = scale(size, false);
  const deviceIsTablet = isTablet();
  const moderationFactor = deviceIsTablet ? TABLET_SCALE_FACTOR : factor;
  
  let finalScale = baseScale + (baseScale * moderationFactor);
  
  if (includeAccessibility) {
    const accessibilityScale = PixelRatio.getFontScale();
    finalScale *= accessibilityScale;
  }
  
  // Constrain scale within reasonable bounds
  finalScale = Math.max(size * MIN_SCALE, Math.min(size * MAX_SCALE, finalScale));
  
  return Math.round(finalScale);
});

/**
 * Comprehensive responsive style configurations
 */
export const responsiveStyles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    flexDirection: Platform.select({ ios: 'row', android: 'row' }),
  },
  
  text: {
    fontSize: moderateScale(16),
    lineHeight: moderateScale(24),
    textAlign: Platform.select({ ios: 'left', android: 'left' }),
  },
  
  spacing: {
    small: scale(8),
    medium: scale(16),
    large: scale(24),
    extraLarge: scale(32),
  },
  
  tablet: {
    container: {
      paddingHorizontal: scale(24),
      paddingVertical: verticalScale(16),
      maxWidth: scale(720),
    },
    text: {
      fontSize: moderateScale(18),
      lineHeight: moderateScale(28),
    },
  },
  
  rtl: {
    container: {
      flexDirection: Platform.select({ ios: 'row-reverse', android: 'row-reverse' }),
    },
    text: {
      textAlign: Platform.select({ ios: 'right', android: 'right' }),
      writingDirection: 'rtl',
    },
  },
  
  accessibility: {
    touchableArea: {
      minHeight: moderateScale(44, SCALE_FACTOR, true),
      minWidth: moderateScale(44, SCALE_FACTOR, true),
    },
    text: {
      fontSize: moderateScale(16, SCALE_FACTOR, true),
      lineHeight: moderateScale(24, SCALE_FACTOR, true),
    },
    spacing: {
      small: moderateScale(8, SCALE_FACTOR, true),
      medium: moderateScale(16, SCALE_FACTOR, true),
      large: moderateScale(24, SCALE_FACTOR, true),
    },
  },
});