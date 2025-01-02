/**
 * @fileoverview Enhanced SafeAreaView component with comprehensive device compatibility
 * Supports notches, home indicators, and various screen cutouts while ensuring RTL compatibility
 * @version 1.0.0
 * @package MyFamily Mobile
 */

import React, { useMemo } from 'react'; // react@18.2+
import { SafeAreaView, StyleSheet, ViewStyle } from 'react-native'; // react-native@0.71+
import { isIOS } from '../../../utils/platform.util';
import { scale, verticalScale } from '../../../styles/responsive';

/**
 * Props interface for SafeAreaView component with comprehensive type safety
 */
interface SafeAreaViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  edges?: boolean;
  respectRTL?: boolean;
  isTablet?: boolean;
}

/**
 * Enhanced SafeAreaView component with optimized performance and device compatibility
 */
const SafeAreaViewWrapper: React.FC<SafeAreaViewProps> = React.memo(({
  children,
  style,
  edges = true,
  respectRTL = true,
  isTablet = false,
}) => {
  /**
   * Memoized calculation of safe area insets based on device type and orientation
   */
  const safeAreaInsets = useMemo(() => ({
    top: isIOS() ? verticalScale(edges ? 44 : 0) : verticalScale(edges ? 24 : 0),
    bottom: isIOS() ? verticalScale(edges ? 34 : 0) : verticalScale(edges ? 16 : 0),
    horizontal: scale(isTablet ? 24 : 16),
  }), [edges, isTablet]);

  /**
   * Memoized style composition with RTL support and tablet optimization
   */
  const containerStyle = useMemo(() => {
    const baseStyles = [
      styles.container,
      {
        paddingTop: safeAreaInsets.top,
        paddingBottom: safeAreaInsets.bottom,
        paddingHorizontal: safeAreaInsets.horizontal,
      },
      respectRTL && styles.rtlContainer,
      isTablet && styles.tabletContainer,
    ];

    return StyleSheet.flatten([...baseStyles, style]);
  }, [safeAreaInsets, respectRTL, isTablet, style]);

  return (
    <SafeAreaView style={containerStyle}>
      {children}
    </SafeAreaView>
  );
});

/**
 * Optimized styles with performance considerations
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  rtlContainer: {
    flexDirection: 'row-reverse',
  },
  tabletContainer: {
    maxWidth: scale(720),
    alignSelf: 'center',
  },
});

// Display name for debugging
SafeAreaViewWrapper.displayName = 'SafeAreaViewWrapper';

// Default export with type safety
export default SafeAreaViewWrapper;

// Named export for specific use cases
export type { SafeAreaViewProps };