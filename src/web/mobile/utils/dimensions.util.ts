import { Dimensions, PixelRatio } from 'react-native'; // react-native@0.71+
import { useCallback, useEffect, useMemo } from 'react'; // react@18.2+

// Constants
const TABLET_THRESHOLD = 7; // Minimum diagonal screen size in inches for tablet detection
const DIMENSION_CHANGE_EVENT = 'change';

// Cache objects for memoization
const dimensionCache = {
  width: Dimensions.get('window').width,
  height: Dimensions.get('window').height,
  pixelRatio: PixelRatio.get(),
  isTablet: null as boolean | null,
};

/**
 * Gets the current screen width with memoization for performance optimization
 * Updates automatically on dimension changes
 * @returns {number} Current screen width in pixels
 */
export const getScreenWidth = (): number => {
  if (dimensionCache.width) {
    return dimensionCache.width;
  }

  const { width } = Dimensions.get('window');
  dimensionCache.width = width;
  return width;
};

/**
 * Gets the current screen height with memoization for performance optimization
 * Updates automatically on dimension changes
 * @returns {number} Current screen height in pixels
 */
export const getScreenHeight = (): number => {
  if (dimensionCache.height) {
    return dimensionCache.height;
  }

  const { height } = Dimensions.get('window');
  dimensionCache.height = height;
  return height;
};

/**
 * Gets the device pixel ratio with caching for performance
 * @returns {number} Device pixel ratio
 */
export const getPixelRatio = (): number => {
  if (dimensionCache.pixelRatio) {
    return dimensionCache.pixelRatio;
  }

  const ratio = PixelRatio.get();
  dimensionCache.pixelRatio = ratio;
  return ratio;
};

/**
 * Determines if the current device is a tablet based on screen size
 * Uses diagonal screen size calculation and pixel ratio
 * @returns {boolean} True if device is a tablet, false otherwise
 */
export const isTablet = (): boolean => {
  if (dimensionCache.isTablet !== null) {
    return dimensionCache.isTablet;
  }

  const pixelRatio = getPixelRatio();
  const width = getScreenWidth();
  const height = getScreenHeight();

  // Convert to physical pixels
  const physicalWidth = width * pixelRatio;
  const physicalHeight = height * pixelRatio;

  // Calculate diagonal size in inches
  const diagonalSizeInPixels = Math.sqrt(
    Math.pow(physicalWidth, 2) + Math.pow(physicalHeight, 2)
  );
  const diagonalSizeInInches = diagonalSizeInPixels / (pixelRatio * 160); // 160 is the standard DPI

  dimensionCache.isTablet = diagonalSizeInInches >= TABLET_THRESHOLD;
  return dimensionCache.isTablet;
};

/**
 * Interface for dimension change event data
 */
interface DimensionChangeEvent {
  window: {
    width: number;
    height: number;
  };
  screen: {
    width: number;
    height: number;
  };
}

/**
 * Custom hook for subscribing to dimension changes
 * Provides type-safe dimension updates
 * @param callback Function to be called when dimensions change
 */
export const useDimensionListener = (
  callback: (dimensions: DimensionChangeEvent) => void
): void => {
  // Memoize callback to prevent unnecessary re-renders
  const memoizedCallback = useCallback(callback, [callback]);

  useEffect(() => {
    // Update cache and notify on dimension changes
    const dimensionChangeHandler = ({ window, screen }: DimensionChangeEvent) => {
      dimensionCache.width = window.width;
      dimensionCache.height = window.height;
      dimensionCache.isTablet = null; // Reset tablet detection on dimension change
      memoizedCallback({ window, screen });
    };

    // Subscribe to dimension changes
    const subscription = Dimensions.addEventListener(
      DIMENSION_CHANGE_EVENT,
      dimensionChangeHandler
    );

    // Provide initial dimensions
    memoizedCallback({
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen'),
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.remove();
    };
  }, [memoizedCallback]);
};

/**
 * Resets the dimension cache
 * Useful for testing or forcing dimension recalculation
 */
export const resetDimensionCache = (): void => {
  dimensionCache.width = Dimensions.get('window').width;
  dimensionCache.height = Dimensions.get('window').height;
  dimensionCache.pixelRatio = PixelRatio.get();
  dimensionCache.isTablet = null;
};