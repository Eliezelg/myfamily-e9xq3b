/**
 * Authentication Navigation Stack Component
 * Implements secure navigation flow between authentication screens
 * with comprehensive accessibility and RTL support
 * @version 1.0.0
 */

import React, { useEffect } from 'react'; // v18.2+
import { createStackNavigator } from '@react-navigation/stack'; // v6.0+
import { Platform, AccessibilityInfo } from 'react-native'; // v0.71+

// Internal imports
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';

/**
 * Type definitions for authentication stack navigation parameters
 */
export type AuthStackParamList = {
  Login: undefined;
  Register: {
    referralCode?: string;
  };
};

// Create typed navigator
const Stack = createStackNavigator<AuthStackParamList>();

/**
 * Enhanced authentication screen options with security and accessibility
 */
const AUTH_SCREEN_OPTIONS = {
  headerShown: false,
  gestureEnabled: false,
  animationEnabled: true,
  cardStyleInterpolator: Platform.select({
    ios: 'forHorizontalRTL',
    android: 'forFadeFromBottomAndroid',
    default: 'forHorizontalRTL',
  }),
  screenReaderAnnouncement: '',
};

/**
 * Security configuration for deep link protection
 */
const SECURE_SCREEN_CONFIG = {
  allowedDeepLinks: ['login', 'register'],
  maxAttempts: 3,
  timeoutDuration: 300000, // 5 minutes
};

/**
 * Enhanced Authentication Navigator Component
 * Implements secure navigation with accessibility support
 */
const AuthNavigator: React.FC = () => {
  /**
   * Setup accessibility announcements for screen transitions
   */
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility('Authentication screens loaded');

    return () => {
      AccessibilityInfo.announceForAccessibility('Exiting authentication flow');
    };
  }, []);

  /**
   * Enhanced screen options with security and accessibility
   */
  const getScreenOptions = (routeName: keyof AuthStackParamList) => ({
    ...AUTH_SCREEN_OPTIONS,
    screenReaderAnnouncement: `Navigated to ${routeName} screen`,
    gestureDirection: Platform.select({
      ios: 'horizontal-rtl',
      android: 'horizontal',
      default: 'horizontal-rtl',
    }),
  });

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        keyboardHandlingEnabled: true,
        headerMode: 'none',
        presentation: 'card',
        detachInactiveScreens: true,
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={() => ({
          ...getScreenOptions('Login'),
          accessibilityLabel: 'Login Screen',
          accessibilityHint: 'Screen for user authentication',
        })}
      />

      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={() => ({
          ...getScreenOptions('Register'),
          accessibilityLabel: 'Registration Screen',
          accessibilityHint: 'Screen for new user registration',
        })}
      />
    </Stack.Navigator>
  );
};

// Export the navigator component
export default AuthNavigator;