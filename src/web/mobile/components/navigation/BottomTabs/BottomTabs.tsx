/**
 * @fileoverview Mobile bottom tab navigation component with platform-specific optimizations
 * Provides access to primary app sections with RTL support and accessibility features
 * @version 1.0.0
 * @package MyFamily Mobile
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  I18nManager,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native'; // v0.71+
import { createBottomTabNavigator, useBottomTabBarHeight } from '@react-navigation/bottom-tabs'; // v6.0+
import { MaterialIcons } from '@expo/vector-icons'; // v13.0+
import { TouchableRipple } from '../../common/TouchableRipple/TouchableRipple';

// Type definitions
interface BottomTabsProps {
  navigation: any;
  isRTL: boolean;
  reducedMotion: boolean;
}

interface TabConfig {
  icon: string;
  label: string;
  accessibilityLabel: string;
}

// Tab configuration with accessibility labels
const TAB_CONFIG: Record<string, TabConfig> = {
  Dashboard: {
    icon: 'dashboard',
    label: 'Dashboard',
    accessibilityLabel: 'Navigate to Dashboard',
  },
  Content: {
    icon: 'add-photo-alternate',
    label: 'Upload',
    accessibilityLabel: 'Upload new content',
  },
  Gazette: {
    icon: 'preview',
    label: 'Preview',
    accessibilityLabel: 'Preview gazette',
  },
  Payment: {
    icon: 'account-balance-wallet',
    label: 'Pool',
    accessibilityLabel: 'Manage family pool',
  },
};

const Tab = createBottomTabNavigator();

/**
 * Renders tab bar icon with RTL support and accessibility
 */
const renderTabBarIcon = (route: string, focused: boolean, color: string) => {
  const { icon } = TAB_CONFIG[route];
  const iconStyle = [
    styles.tabBarIcon,
    I18nManager.isRTL && styles.tabBarIconRTL,
  ];

  return (
    <MaterialIcons
      name={icon}
      size={24}
      color={color}
      style={iconStyle}
      accessibilityRole="image"
      accessibilityLabel={TAB_CONFIG[route].accessibilityLabel}
    />
  );
};

/**
 * Renders tab bar label with RTL support and accessibility
 */
const renderTabBarLabel = (route: string, focused: boolean, color: string) => {
  const { label, accessibilityLabel } = TAB_CONFIG[route];
  
  return (
    <Text
      style={[
        styles.tabBarLabel,
        { color },
        I18nManager.isRTL && styles.tabBarLabelRTL,
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      numberOfLines={1}
    >
      {label}
    </Text>
  );
};

/**
 * BottomTabs component with platform optimizations and accessibility
 */
const BottomTabs: React.FC<BottomTabsProps> = ({
  navigation,
  isRTL,
  reducedMotion,
}) => {
  const tabBarHeight = useBottomTabBarHeight();

  // Memoize tab bar styles for performance
  const tabBarStyle = useMemo<StyleProp<ViewStyle>>(() => [
    styles.tabBar,
    {
      height: tabBarHeight,
      flexDirection: isRTL ? 'row-reverse' : 'row',
    },
  ], [tabBarHeight, isRTL]);

  // Tab press handler with haptic feedback
  const handleTabPress = useCallback((route: string) => {
    if (!reducedMotion) {
      // Add platform-specific haptic feedback here
    }
    navigation.navigate(route);
  }, [navigation, reducedMotion]);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: tabBarStyle,
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#757575',
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        headerShown: false,
        tabBarButton: (props) => (
          <TouchableRipple
            {...props}
            rippleColor="rgba(33, 150, 243, 0.12)"
            accessibilityRole="tab"
          />
        ),
      }}
    >
      {Object.keys(TAB_CONFIG).map((route) => (
        <Tab.Screen
          key={route}
          name={route}
          component={React.lazy(() => import(`../../screens/${route}Screen`))}
          options={{
            tabBarIcon: ({ focused, color }) => renderTabBarIcon(route, focused, color),
            tabBarLabel: ({ focused, color }) => renderTabBarLabel(route, focused, color),
            tabBarAccessibilityLabel: TAB_CONFIG[route].accessibilityLabel,
          }}
          listeners={{
            tabPress: () => handleTabPress(route),
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingBottom: Platform.select({ ios: 8, android: 12 }),
    paddingHorizontal: 8,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBarIcon: {
    marginBottom: 4,
  },
  tabBarIconRTL: {
    transform: [{ scaleX: -1 }],
  },
  tabBarLabel: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    marginTop: 4,
    textAlign: 'center',
  },
  tabBarLabelRTL: {
    textAlign: 'right',
  },
});

export default BottomTabs;