/**
 * @fileoverview Enhanced KeyboardAvoidingView component for React Native
 * Handles platform-specific keyboard behavior with accessibility support
 * @version 1.0.0
 * @package MyFamily Mobile
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'; // react@18.2+
import {
  KeyboardAvoidingView,
  ViewProps,
  Keyboard,
  Dimensions,
  EmitterSubscription,
  Platform,
  ViewStyle,
} from 'react-native'; // react-native@0.71+

import { isIOS } from '../../utils/platform.util';
import { getScreenHeight } from '../../utils/dimensions.util';

/**
 * Props interface extending ViewProps with additional keyboard avoiding functionality
 */
export interface KeyboardAvoidingViewProps extends ViewProps {
  children: React.ReactNode;
  keyboardVerticalOffset?: number;
  style?: ViewStyle;
  behavior?: 'height' | 'position' | 'padding';
  enabled?: boolean;
}

/**
 * Custom hook to manage keyboard behavior and dimensions
 * @param enabled - Whether keyboard avoidance is enabled
 */
const useKeyboardBehavior = (enabled: boolean = true) => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [dimensionSubscription, setDimensionSubscription] = useState<EmitterSubscription | null>(null);

  // Memoize platform-specific behavior
  const behavior = useMemo(() => {
    return isIOS() ? 'padding' : 'height';
  }, []);

  // Handle keyboard show event
  const handleKeyboardShow = useCallback((event: any) => {
    if (!enabled) return;
    
    setKeyboardVisible(true);
    const keyboardHeight = event.endCoordinates.height;
    const screenHeight = getScreenHeight();
    
    // Calculate offset based on screen height and keyboard height
    const calculatedOffset = Math.min(keyboardHeight, screenHeight * 0.4);
    setKeyboardOffset(calculatedOffset);
  }, [enabled]);

  // Handle keyboard hide event
  const handleKeyboardHide = useCallback(() => {
    if (!enabled) return;
    
    setKeyboardVisible(false);
    setKeyboardOffset(0);
  }, [enabled]);

  // Set up keyboard listeners
  useEffect(() => {
    if (!enabled) return;

    const keyboardShowListener = Keyboard.addListener(
      Platform.select({ ios: 'keyboardWillShow', android: 'keyboardDidShow' }),
      handleKeyboardShow
    );

    const keyboardHideListener = Keyboard.addListener(
      Platform.select({ ios: 'keyboardWillHide', android: 'keyboardDidHide' }),
      handleKeyboardHide
    );

    // Handle orientation changes
    const dimensionListener = Dimensions.addEventListener('change', () => {
      if (keyboardVisible) {
        Keyboard.dismiss();
      }
    });

    setDimensionSubscription(dimensionListener);

    // Cleanup listeners
    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
      dimensionListener.remove();
    };
  }, [enabled, handleKeyboardShow, handleKeyboardHide, keyboardVisible]);

  return {
    keyboardOffset,
    keyboardVisible,
    behavior,
  };
};

/**
 * Enhanced KeyboardAvoidingView component with platform-specific behavior
 * and performance optimizations
 */
const KeyboardAvoidingViewWrapper: React.FC<KeyboardAvoidingViewProps> = ({
  children,
  keyboardVerticalOffset = 0,
  style,
  behavior: propBehavior,
  enabled = true,
  ...props
}) => {
  // Initialize keyboard behavior hook
  const { keyboardOffset, keyboardVisible, behavior: defaultBehavior } = useKeyboardBehavior(enabled);

  // Calculate final vertical offset
  const finalKeyboardVerticalOffset = useMemo(() => {
    return keyboardVerticalOffset + (keyboardVisible ? keyboardOffset : 0);
  }, [keyboardVerticalOffset, keyboardVisible, keyboardOffset]);

  // Memoize combined styles
  const combinedStyle = useMemo(() => ({
    flex: 1,
    ...style,
  }), [style]);

  return (
    <KeyboardAvoidingView
      behavior={propBehavior || defaultBehavior}
      keyboardVerticalOffset={finalKeyboardVerticalOffset}
      style={combinedStyle}
      enabled={enabled}
      {...props}
      // Accessibility properties
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel="Keyboard avoiding container"
      accessibilityHint="Adjusts content when keyboard appears"
    >
      {children}
    </KeyboardAvoidingView>
  );
};

// Optimize re-renders
export default React.memo(KeyboardAvoidingViewWrapper);