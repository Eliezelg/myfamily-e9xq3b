import React, { useEffect, Suspense } from 'react';
import { Provider } from 'react-redux'; // v8.0.5
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // v6.8.0
import { I18nextProvider } from 'react-i18next'; // v12.1.0
import * as Sentry from '@sentry/react'; // v7.0.0
import { ErrorBoundary } from '@sentry/react'; // v7.0.0

import ThemeConfig from './config/theme.config';
import { i18nConfig, initializeI18n } from './config/i18n.config';
import { routeConfig } from './config/routes.config';
import { store } from './store'; // Assumed Redux store configuration

// Lazy-loaded components for route-based code splitting
const DashboardLayout = React.lazy(() => import('./layouts/DashboardLayout'));
const AuthLayout = React.lazy(() => import('./layouts/AuthLayout'));
const ErrorLayout = React.lazy(() => import('./layouts/ErrorLayout'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="app-loading">
    <div className="loading-spinner" role="progressbar" aria-label="Loading application">
      Loading...
    </div>
  </div>
);

// Error fallback component
const ErrorFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
  <div className="error-boundary" role="alert">
    <h2>Something went wrong</h2>
    <pre>{error.message}</pre>
    <button onClick={resetError}>Try again</button>
  </div>
);

// Initialize Sentry for error tracking
Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
  integrations: [new Sentry.BrowserTracing()],
});

// Root application component
const App: React.FC = () => {
  // Initialize i18n on mount
  useEffect(() => {
    const initI18n = async () => {
      try {
        await initializeI18n();
      } catch (error) {
        Sentry.captureException(error);
        console.error('Failed to initialize i18n:', error);
      }
    };
    initI18n();
  }, []);

  // Performance monitoring
  useEffect(() => {
    const reportWebVitals = async (metric: any) => {
      if (metric.name === 'FCP') {
        Sentry.captureMessage(`First Contentful Paint: ${metric.value}`, 'info');
      }
    };

    // @ts-ignore - Web Vitals types
    import('web-vitals').then(({ getCLS, getFID, getFCP }) => {
      getCLS(reportWebVitals);
      getFID(reportWebVitals);
      getFCP(reportWebVitals);
    });
  }, []);

  return (
    <ErrorBoundary
      fallback={ErrorFallback}
      onError={(error) => {
        Sentry.captureException(error);
      }}
    >
      <Provider store={store}>
        <I18nextProvider i18n={i18nConfig}>
          <ThemeConfig>
            <BrowserRouter>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  {/* Public Routes */}
                  {routeConfig.publicRoutes.map((route) => (
                    <Route
                      key={route}
                      path={route}
                      element={<AuthLayout />}
                    />
                  ))}

                  {/* Protected Routes */}
                  {Object.entries(routeConfig.privateRoutes).map(([key, config]) => (
                    <Route
                      key={key}
                      path={config.path}
                      element={
                        <DashboardLayout
                          roles={config.roles}
                          rateLimit={config.rateLimit}
                        />
                      }
                    >
                      {config.children.map((child) => (
                        <Route
                          key={child.path}
                          path={child.path}
                          element={
                            <Suspense fallback={<LoadingFallback />}>
                              {React.createElement(
                                React.lazy(() => import(`./pages/${child.element}`))
                              )}
                            </Suspense>
                          }
                        />
                      ))}
                    </Route>
                  ))}

                  {/* Error Routes */}
                  {Object.entries(routeConfig.errorRoutes).map(([key, route]) => (
                    <Route
                      key={key}
                      path={route.path}
                      element={
                        <ErrorLayout>
                          {React.createElement(
                            React.lazy(() => import(`./pages/errors/${route.element}`))
                          )}
                        </ErrorLayout>
                      }
                    />
                  ))}

                  {/* Default Route */}
                  <Route
                    path="/"
                    element={<Navigate to={routeConfig.defaultRoute} replace />}
                  />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ThemeConfig>
        </I18nextProvider>
      </Provider>
    </ErrorBoundary>
  );
};

// Export wrapped with Sentry performance monitoring
export default Sentry.withProfiler(App);