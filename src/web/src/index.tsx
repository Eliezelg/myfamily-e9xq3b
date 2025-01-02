/**
 * Root entry point for MyFamily web application
 * Version: 1.0.0
 * 
 * Initializes React application with comprehensive error handling,
 * performance monitoring, and development tooling.
 */

import React, { StrictMode } from 'react'; // v18.2.0
import { createRoot } from 'react-dom/client'; // v18.2.0
import { Provider } from 'react-redux'; // v8.0.5
import { PersistGate } from 'redux-persist/integration/react'; // v6.0.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import * as Sentry from '@sentry/react'; // v7.0.0

import App from './app';
import { store, persistor } from './store';
import ThemeConfig from './config/theme.config';
import { initializeI18n } from './config/i18n.config';

// Root element ID constant
const ROOT_ELEMENT_ID = 'root';

// Performance monitoring thresholds
const PERFORMANCE_BUDGET = {
  firstRender: 3000, // 3 seconds
  subsequentRender: 1000 // 1 second
};

/**
 * Error Fallback Component
 */
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div role="alert" className="error-boundary">
    <h2>Something went wrong</h2>
    <pre>{error.message}</pre>
    <button onClick={resetErrorBoundary}>Try again</button>
  </div>
);

/**
 * Initialize Sentry for error tracking
 */
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.2,
    integrations: [new Sentry.BrowserTracing()],
    beforeSend(event) {
      // Sanitize sensitive data before sending to Sentry
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    }
  });
}

/**
 * Setup development tools and error overlay
 */
const setupDevelopmentTools = () => {
  if (process.env.NODE_ENV === 'development') {
    // Enable hot module replacement
    if (module.hot) {
      module.hot.accept('./app', () => {
        renderApp();
      });
    }

    // Initialize error overlay
    const { reportWebVitals } = require('web-vitals');
    reportWebVitals(console.log);
  }
};

/**
 * Initialize and render the React application
 */
const renderApp = async () => {
  try {
    // Initialize i18n
    await initializeI18n();

    // Get root element
    const rootElement = document.getElementById(ROOT_ELEMENT_ID);
    if (!rootElement) {
      throw new Error(`Unable to find root element with id: ${ROOT_ELEMENT_ID}`);
    }

    // Create React 18 root
    const root = createRoot(rootElement);

    // Render application with all providers
    root.render(
      <StrictMode>
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onError={(error) => {
            console.error('Application Error:', error);
            Sentry.captureException(error);
          }}
          onReset={() => {
            // Reset application state on error recovery
            window.location.href = '/';
          }}
        >
          <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <ThemeConfig>
                <App />
              </ThemeConfig>
            </PersistGate>
          </Provider>
        </ErrorBoundary>
      </StrictMode>
    );

    // Setup performance monitoring
    if (process.env.NODE_ENV === 'production') {
      const { getCLS, getFID, getFCP } = require('web-vitals');
      getCLS((metric: any) => {
        if (metric.value > 0.1) {
          Sentry.captureMessage(`High CLS detected: ${metric.value}`, 'warning');
        }
      });
      getFID((metric: any) => {
        if (metric.value > PERFORMANCE_BUDGET.firstRender) {
          Sentry.captureMessage(`High FID detected: ${metric.value}ms`, 'warning');
        }
      });
      getFCP((metric: any) => {
        if (metric.value > PERFORMANCE_BUDGET.subsequentRender) {
          Sentry.captureMessage(`High FCP detected: ${metric.value}ms`, 'warning');
        }
      });
    }
  } catch (error) {
    console.error('Failed to render application:', error);
    Sentry.captureException(error);
    
    // Show user-friendly error message
    document.body.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <h1>Unable to load application</h1>
        <p>Please try refreshing the page. If the problem persists, contact support.</p>
      </div>
    `;
  }
};

// Setup development tools
setupDevelopmentTools();

// Initialize application
renderApp();

// Handle unhandled errors and rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  Sentry.captureException(event.reason);
});

window.addEventListener('error', (event) => {
  console.error('Unhandled Error:', event.error);
  Sentry.captureException(event.error);
});