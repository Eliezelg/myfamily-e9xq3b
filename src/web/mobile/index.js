/**
 * Entry point for MyFamily mobile application
 * Implements core app initialization with enhanced security, accessibility, and error handling
 * @version 1.0.0
 * @package MyFamily Mobile
 */

// External imports with version specifications
import { registerRootComponent } from 'expo'; // ^48.0.0
import { Provider } from 'react-redux'; // ^8.0.5
import { I18nextProvider } from 'react-i18next'; // ^12.2.0
import { ErrorBoundary } from 'react-error-boundary'; // ^7.0.0
import { AccessibilityInfo, I18nManager, Platform } from 'react-native'; // ^0.71.0
import * as Sentry from '@sentry/react-native'; // ^5.0.0
import { configureStore } from '@reduxjs/toolkit'; // ^1.9.0
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Internal imports
import AppNavigator from './navigation/AppNavigator';
import authReducer from '../src/store/slices/auth.slice';
import { apiConfig } from '../src/config/api.config';

// Initialize Sentry for error tracking
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,
  debug: __DEV__,
  environment: __DEV__ ? 'development' : 'production',
});

// Configure Redux store with security middleware
const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/login/fulfilled', 'auth/refresh/fulfilled'],
      },
      thunk: {
        extraArgument: { api: apiConfig },
      },
    }),
  devTools: __DEV__,
});

// Configure i18n with supported languages
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: require('./locales/en.json') },
      he: { translation: require('./locales/he.json') },
      ar: { translation: require('./locales/ar.json') },
      es: { translation: require('./locales/es.json') },
      fr: { translation: require('./locales/fr.json') },
      de: { translation: require('./locales/de.json') },
      ru: { translation: require('./locales/ru.json') },
      zh: { translation: require('./locales/zh.json') },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Configure RTL support
I18nManager.allowRTL(true);
I18nManager.forceRTL(['he', 'ar'].includes(i18n.language));

/**
 * Global error handler component
 */
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 16, marginBottom: 10 }}>
        Something went wrong. Please try again.
      </Text>
      <TouchableOpacity
        onPress={resetErrorBoundary}
        style={{ padding: 10, backgroundColor: '#2196F3', borderRadius: 5 }}
      >
        <Text style={{ color: '#FFFFFF' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * Enhanced error handling function
 */
const handleError = (error, errorInfo) => {
  Sentry.captureException(error, {
    extra: {
      errorInfo,
      platform: Platform.OS,
      version: Platform.Version,
    },
  });
  
  // Log error metrics
  console.error('Application Error:', error);
  
  // Show user-friendly error message
  AccessibilityInfo.announceForAccessibility('An error occurred. Please try again.');
};

/**
 * Root application component with providers and error handling
 */
const App = () => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => {
        // Reset application state if needed
      }}
    >
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>
          <AppNavigator />
        </I18nextProvider>
      </Provider>
    </ErrorBoundary>
  );
};

// Register the root component with Expo
registerRootComponent(App);

// Export for testing purposes
export default App;