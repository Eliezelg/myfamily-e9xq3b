/**
 * @fileoverview Stack Navigator component with RTL and accessibility support
 * Provides configurable stack-based navigation with internationalization
 * @version 1.0.0
 * @package MyFamily Mobile
 */

import React, { useMemo } from 'react'; // react@18.2+
import { createStackNavigator } from '@react-navigation/stack'; // @react-navigation/stack@6.0+
import { useTranslation } from 'react-i18next'; // react-i18next@12.0+
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from '../../common/SafeAreaView/SafeAreaView';
import { scale, moderateScale } from '../../../styles/responsive';
import { isIOS } from '../../../utils/platform.util';

// Type definitions for props and options
interface StackNavigatorProps {
  screens: Record<string, React.ComponentType>;
  initialRouteName: string;
  screenOptions?: StackNavigationOptions;
  navigationKey?: string;
  isRTL?: boolean;
}

// Stack navigator instance
const Stack = createStackNavigator();

/**
 * Default screen options with RTL and accessibility support
 */
const DEFAULT_SCREEN_OPTIONS: StackNavigationOptions = {
  headerStyle: {
    backgroundColor: '#FFFFFF',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerTitleStyle: {
    fontFamily: 'Roboto-Regular',
    fontSize: moderateScale(18),
    color: '#000000',
    textAlign: 'center',
  },
  cardStyle: {
    backgroundColor: '#FFFFFF',
  },
  gestureEnabled: true,
  animationEnabled: true,
  presentation: 'card',
  headerTitleAlign: 'center',
  headerLeftContainerStyle: {
    paddingLeft: scale(16),
  },
  headerRightContainerStyle: {
    paddingRight: scale(16),
  },
};

/**
 * Get screen options based on RTL and device settings
 */
const getDefaultScreenOptions = (
  isRTL: boolean,
  scale: number = 1
): StackNavigationOptions => {
  const baseOptions = { ...DEFAULT_SCREEN_OPTIONS };

  // RTL-specific configurations
  if (isRTL) {
    baseOptions.headerTitleStyle = {
      ...baseOptions.headerTitleStyle,
      writingDirection: 'rtl',
    };
    baseOptions.headerLeftContainerStyle = {
      paddingRight: scale(16),
    };
    baseOptions.headerRightContainerStyle = {
      paddingLeft: scale(16),
    };
  }

  // Platform-specific animations
  baseOptions.cardStyleInterpolator = isRTL
    ? forHorizontalRTLIOS
    : forHorizontalIOS;
  
  baseOptions.gestureDirection = isRTL ? 'horizontal-inverted' : 'horizontal';

  // iOS-specific configurations
  if (isIOS()) {
    baseOptions.headerShadowVisible = false;
    baseOptions.gestureResponseDistance = scale(50);
  }

  return baseOptions;
};

/**
 * RTL-aware horizontal slide animation
 */
const forHorizontalRTLIOS = ({ current, layouts }: any) => ({
  cardStyle: {
    transform: [
      {
        translateX: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-layouts.screen.width, 0],
        }),
      },
    ],
  },
});

/**
 * Stack Navigator Component
 */
const StackNavigator: React.FC<StackNavigatorProps> = ({
  screens,
  initialRouteName,
  screenOptions,
  navigationKey,
  isRTL = false,
}) => {
  const { t } = useTranslation();

  // Memoized screen options
  const defaultOptions = useMemo(
    () => getDefaultScreenOptions(isRTL),
    [isRTL]
  );

  // Merge custom options with defaults
  const mergedOptions = useMemo(
    () => ({
      ...defaultOptions,
      ...screenOptions,
    }),
    [defaultOptions, screenOptions]
  );

  return (
    <SafeAreaView edges={true} respectRTL={isRTL}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={mergedOptions}
        key={navigationKey}
      >
        {Object.entries(screens).map(([name, component]) => (
          <Stack.Screen
            key={name}
            name={name}
            component={component}
            options={{
              title: t(`screens.${name}.title`),
              headerAccessibilityLabel: t(`screens.${name}.headerAccessibility`),
              ...mergedOptions,
            }}
          />
        ))}
      </Stack.Navigator>
    </SafeAreaView>
  );
};

/**
 * Optimized styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontFamily: 'Roboto-Regular',
    color: '#000000',
  },
  headerContainer: {
    height: Platform.select({ ios: 44, android: 56 }),
  },
});

// Display name for debugging
StackNavigator.displayName = 'StackNavigator';

// Default export
export default StackNavigator;

// Named exports for specific use cases
export type { StackNavigatorProps };
export { getDefaultScreenOptions };