import { useState, useEffect, useCallback, useMemo } from 'react'; // v18.2+
import { debounce } from 'lodash'; // v4.17+
import { BREAKPOINTS } from '../styles/theme.styles';

/**
 * Interface defining the responsive state object returned by useResponsive hook
 */
interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: string;
  isPortrait: boolean;
  isLandscape: boolean;
}

/**
 * Helper function to safely get initial window dimensions with SSR support
 */
const getInitialDimensions = () => {
  if (typeof window === 'undefined') {
    return {
      width: 0,
      height: 0
    };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
};

/**
 * Helper function to determine current breakpoint based on screen width
 * @param width - Current screen width
 * @returns Current breakpoint name with type safety
 */
const getBreakpoint = (width: number): 'mobile' | 'tablet' | 'desktop' => {
  if (!width) return 'mobile';
  
  const mobileMax = parseInt(BREAKPOINTS.mobile.max);
  const tabletMax = parseInt(BREAKPOINTS.tablet.max);
  
  if (width <= mobileMax) return 'mobile';
  if (width <= tabletMax) return 'tablet';
  return 'desktop';
};

/**
 * Custom hook that provides responsive design utilities and screen size information
 * with optimized performance through debouncing and memoization
 */
export const useResponsive = (): ResponsiveState => {
  // Initialize state with SSR-safe default values
  const [dimensions, setDimensions] = useState(getInitialDimensions());
  
  // Create memoized initial values
  const initialState = useMemo<ResponsiveState>(() => {
    const { width, height } = dimensions;
    const breakpoint = getBreakpoint(width);
    return {
      isMobile: breakpoint === 'mobile',
      isTablet: breakpoint === 'tablet',
      isDesktop: breakpoint === 'desktop',
      screenWidth: width,
      screenHeight: height,
      orientation: height >= width ? 'portrait' : 'landscape',
      isPortrait: height >= width,
      isLandscape: width > height
    };
  }, []);

  const [responsiveState, setResponsiveState] = useState<ResponsiveState>(initialState);

  // Create debounced resize handler for performance
  const handleResize = useCallback(
    debounce(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const breakpoint = getBreakpoint(width);

      setDimensions({ width, height });
      setResponsiveState({
        isMobile: breakpoint === 'mobile',
        isTablet: breakpoint === 'tablet',
        isDesktop: breakpoint === 'desktop',
        screenWidth: width,
        screenHeight: height,
        orientation: height >= width ? 'portrait' : 'landscape',
        isPortrait: height >= width,
        isLandscape: width > height
      });
    }, 150),
    []
  );

  // Set up effect to initialize dimensions and handle resize events
  useEffect(() => {
    // Skip effect on SSR
    if (typeof window === 'undefined') return;

    // Initialize on mount
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      handleResize.cancel();
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  // Return memoized state
  return useMemo(() => responsiveState, [responsiveState]);
};

// Type export for consuming components
export type { ResponsiveState };