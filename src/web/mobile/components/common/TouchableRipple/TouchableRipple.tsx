/**
 * @fileoverview Cross-platform touchable component with Material Design ripple effect
 * Provides platform-specific feedback and enhanced accessibility support
 * @version 1.0.0
 * @package MyFamily Mobile
 */

import React, { useMemo, useCallback } from 'react';
import {
  TouchableNativeFeedback,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
  type AccessibilityRole,
  type AccessibilityState,
} from 'react-native'; // v0.71+

import { isAndroid, isIOS } from '../../utils/platform.util';
import { getPlatformElevation } from '../../styles/platform';

/**
 * Props interface for TouchableRipple component
 */
export interface TouchableRippleProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  elevation?: number;
  rippleColor?: string;
  borderRadius?: number;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  testID?: string;
}

/**
 * TouchableRipple component providing platform-specific touch feedback
 */
const TouchableRipple: React.FC<TouchableRippleProps> = ({
  children,
  onPress,
  style,
  disabled = false,
  elevation = 0,
  rippleColor = 'rgba(0, 0, 0, 0.12)',
  borderRadius = 8,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  testID,
}) => {
  // Memoize container styles for performance
  const containerStyle = useMemo(() => {
    const baseStyle = [
      styles.container,
      { borderRadius },
      elevation > 0 && getPlatformElevation(elevation),
      disabled && styles.disabled,
      style,
    ];
    return StyleSheet.flatten(baseStyle);
  }, [style, elevation, borderRadius, disabled]);

  // Memoize press handler
  const handlePress = useCallback(() => {
    if (!disabled) {
      onPress();
    }
  }, [disabled, onPress]);

  // Common accessibility props
  const accessibilityProps = {
    accessible: true,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState: {
      ...accessibilityState,
      disabled,
    },
    testID,
  };

  if (isAndroid()) {
    // Android-specific implementation with native feedback
    return (
      <TouchableNativeFeedback
        {...accessibilityProps}
        onPress={handlePress}
        disabled={disabled}
        useForeground={Platform.Version >= 23}
        background={TouchableNativeFeedback.Ripple(rippleColor, false)}
      >
        <View style={containerStyle}>{children}</View>
      </TouchableNativeFeedback>
    );
  }

  if (isIOS()) {
    // iOS-specific implementation with opacity feedback
    return (
      <TouchableOpacity
        {...accessibilityProps}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={styles.ios.opacity.active}
        style={containerStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  // Fallback for web or other platforms
  return (
    <TouchableOpacity
      {...accessibilityProps}
      onPress={handlePress}
      disabled={disabled}
      style={containerStyle}
    >
      {children}
    </TouchableOpacity>
  );
};

/**
 * Component styles
 */
const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  android: {
    ripple: {
      borderless: true,
      color: 'rgba(0, 0, 0, 0.12)',
    },
  },
  ios: {
    opacity: {
      active: 0.7,
      inactive: 1,
    },
  },
});

export default TouchableRipple;