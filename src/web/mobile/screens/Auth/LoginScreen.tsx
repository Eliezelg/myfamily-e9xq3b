/**
 * Enhanced Login Screen Component for MyFamily Mobile Application
 * Implements secure authentication with JWT, OAuth, and 2FA support
 * Features comprehensive accessibility and platform-specific optimizations
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'; // v18.2.0
import {
  View,
  TextInput,
  StyleSheet,
  Image,
  Text,
  Platform,
  AccessibilityInfo,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'; // v0.71+
import { useNavigation, useIsFocused } from '@react-navigation/native'; // v6.0.0

// Internal imports with security and platform optimizations
import { useAuth } from '../../../../src/hooks/useAuth';
import KeyboardAvoidingViewWrapper from '../../components/common/KeyboardAvoidingView/KeyboardAvoidingView';
import SafeAreaViewWrapper from '../../components/common/SafeAreaView/SafeAreaView';
import { scale, moderateScale, responsiveStyles } from '../../styles/responsive';
import { isTablet } from '../../utils/dimensions.util';

// Enhanced login form state interface
interface ILoginFormState {
  email: string;
  password: string;
  isSubmitting: boolean;
  error: string | null;
  attemptCount: number;
  lastAttempt: Date | null;
  deviceFingerprint: string;
  showPassword: boolean;
  isAccessibilityEnabled: boolean;
}

// Security constants
const MAX_LOGIN_ATTEMPTS = 5;
const ATTEMPT_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const MIN_PASSWORD_LENGTH = 8;

/**
 * Enhanced Login Screen Component with security and accessibility features
 */
const LoginScreen: React.FC = () => {
  // Hooks initialization
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { login, loginWithOAuth, verify2FA } = useAuth();
  
  // Enhanced form state management
  const [formState, setFormState] = useState<ILoginFormState>({
    email: '',
    password: '',
    isSubmitting: false,
    error: null,
    attemptCount: 0,
    lastAttempt: null,
    deviceFingerprint: Platform.select({ ios: 'ios', android: 'android' }) || 'unknown',
    showPassword: false,
    isAccessibilityEnabled: false,
  });

  // Accessibility setup
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(enabled => {
      setFormState(prev => ({ ...prev, isAccessibilityEnabled: enabled }));
    });
  }, []);

  // Security monitoring for login attempts
  useEffect(() => {
    if (formState.attemptCount >= MAX_LOGIN_ATTEMPTS && formState.lastAttempt) {
      const timeElapsed = Date.now() - formState.lastAttempt.getTime();
      if (timeElapsed < ATTEMPT_TIMEOUT) {
        Alert.alert(
          'Security Alert',
          `Too many login attempts. Please try again in ${Math.ceil((ATTEMPT_TIMEOUT - timeElapsed) / 60000)} minutes.`
        );
      }
    }
  }, [formState.attemptCount, formState.lastAttempt]);

  // Memoized input validation
  const isFormValid = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(formState.email) && formState.password.length >= MIN_PASSWORD_LENGTH;
  }, [formState.email, formState.password]);

  // Enhanced login handler with security measures
  const handleLogin = useCallback(async () => {
    if (!isFormValid || formState.isSubmitting) return;

    try {
      setFormState(prev => ({
        ...prev,
        isSubmitting: true,
        error: null,
        attemptCount: prev.attemptCount + 1,
        lastAttempt: new Date(),
      }));

      const result = await login({
        email: formState.email,
        password: formState.password,
        deviceFingerprint: formState.deviceFingerprint,
      });

      if (result.requires2FA) {
        navigation.navigate('2FAVerification', {
          email: formState.email,
          sessionId: result.sessionId,
        });
      } else {
        navigation.replace('Dashboard');
      }
    } catch (error) {
      setFormState(prev => ({
        ...prev,
        error: error.message || 'Authentication failed',
        isSubmitting: false,
      }));
    }
  }, [formState, isFormValid, login, navigation]);

  // OAuth login handler
  const handleOAuthLogin = useCallback(async (provider: string) => {
    try {
      setFormState(prev => ({ ...prev, isSubmitting: true, error: null }));
      const result = await loginWithOAuth(provider, formState.deviceFingerprint);
      navigation.replace('Dashboard');
    } catch (error) {
      setFormState(prev => ({
        ...prev,
        error: error.message || 'OAuth authentication failed',
        isSubmitting: false,
      }));
    }
  }, [loginWithOAuth, navigation, formState.deviceFingerprint]);

  return (
    <SafeAreaViewWrapper
      style={styles.container}
      respectRTL={true}
      isTablet={isTablet()}
    >
      <KeyboardAvoidingViewWrapper
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.contentContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            accessibilityLabel="MyFamily Logo"
          />

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              value={formState.email}
              onChangeText={(email) => setFormState(prev => ({ ...prev, email }))}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!formState.isSubmitting}
              accessible={true}
              accessibilityLabel="Email input"
              accessibilityHint="Enter your email address"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                value={formState.password}
                onChangeText={(password) => setFormState(prev => ({ ...prev, password }))}
                placeholder="Password"
                secureTextEntry={!formState.showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!formState.isSubmitting}
                accessible={true}
                accessibilityLabel="Password input"
                accessibilityHint="Enter your password"
              />
              <TouchableOpacity
                onPress={() => setFormState(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                style={styles.showPasswordButton}
                accessibilityRole="button"
                accessibilityLabel={formState.showPassword ? "Hide password" : "Show password"}
              >
                <Text>{formState.showPassword ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>

            {formState.error && (
              <Text style={styles.errorText} accessibilityRole="alert">
                {formState.error}
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.loginButton,
                (!isFormValid || formState.isSubmitting) && styles.loginButtonDisabled
              ]}
              onPress={handleLogin}
              disabled={!isFormValid || formState.isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Login button"
              accessibilityState={{ disabled: !isFormValid || formState.isSubmitting }}
            >
              {formState.isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => handleOAuthLogin('google')}
              disabled={formState.isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Sign in with Google"
            >
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingViewWrapper>
    </SafeAreaViewWrapper>
  );
};

// Enhanced styles with platform-specific optimizations
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  logo: {
    width: scale(120),
    height: scale(120),
    marginBottom: scale(32),
  },
  formContainer: {
    width: '100%',
    maxWidth: isTablet() ? scale(400) : '100%',
  },
  input: {
    height: moderateScale(48),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: scale(8),
    paddingHorizontal: scale(16),
    marginBottom: scale(16),
    fontSize: moderateScale(16),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: scale(16),
  },
  showPasswordButton: {
    position: 'absolute',
    right: scale(16),
    top: scale(12),
    padding: scale(4),
  },
  loginButton: {
    height: moderateScale(48),
    backgroundColor: '#2196F3',
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  loginButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  googleButton: {
    height: moderateScale(48),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  googleButtonText: {
    color: '#757575',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  errorText: {
    color: '#F44336',
    fontSize: moderateScale(14),
    marginBottom: scale(16),
    textAlign: 'center',
  },
});

export default LoginScreen;