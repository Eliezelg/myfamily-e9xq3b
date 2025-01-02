/**
 * Root Redux Store Configuration
 * Version: 1.0.0
 * 
 * Configures the centralized Redux store with all feature slices,
 * middleware, persistence, and performance optimizations for the MyFamily platform.
 */

import { configureStore, Middleware } from '@reduxjs/toolkit'; // v1.9.0
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist'; // v6.0.0
import storage from 'redux-persist/lib/storage';
import { createLogger } from 'redux-logger'; // v3.0.6
import immutableStateInvariant from 'redux-immutable-state-invariant'; // v2.1.0

// Feature reducers
import authReducer from './slices/auth.slice';
import contentReducer from './slices/content.slice';
import familyReducer from './slices/family.slice';
import gazetteReducer from './slices/gazette.slice';
import paymentReducer from './slices/payment.slice';

/**
 * Redux persist configuration
 * Selectively persists critical state while excluding volatile data
 */
const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['auth', 'family'], // Only persist authentication and family data
  blacklist: ['content', 'gazette'], // Don't persist content and gazette state
  throttle: 1000, // Throttle storage writes
  serialize: true,
  debug: process.env.NODE_ENV !== 'production'
};

/**
 * Combined root reducer with persistence
 */
const rootReducer = persistReducer(persistConfig, {
  auth: authReducer,
  content: contentReducer,
  family: familyReducer,
  gazette: gazetteReducer,
  payment: paymentReducer
});

/**
 * Configure development middleware with enhanced debugging
 */
const getDevelopmentMiddleware = (): Middleware[] => {
  const middleware: Middleware[] = [];

  // Add Redux Logger in development
  if (process.env.NODE_ENV !== 'production') {
    middleware.push(createLogger({
      collapsed: true,
      duration: true,
      timestamp: true,
      diff: true
    }));

    // Add immutable state invariant checker
    middleware.push(immutableStateInvariant());
  }

  return middleware;
};

/**
 * Configure production middleware with performance optimizations
 */
const getProductionMiddleware = (): Middleware[] => {
  return [];
};

/**
 * Configure and create the Redux store with all enhancers
 */
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => {
    const defaultMiddleware = getDefaultMiddleware({
      // Middleware configuration
      thunk: true,
      serializableCheck: {
        ignoredActions: [
          FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER
        ]
      },
      immutableCheck: true
    });

    // Add environment-specific middleware
    const environmentMiddleware = process.env.NODE_ENV === 'production'
      ? getProductionMiddleware()
      : getDevelopmentMiddleware();

    return [...defaultMiddleware, ...environmentMiddleware];
  },
  devTools: process.env.NODE_ENV !== 'production',
  preloadedState: undefined,
  enhancers: []
});

/**
 * Configure store persistence
 */
export const persistor = persistStore(store, {
  manualPersist: false,
  transforms: []
});

/**
 * Enable hot module replacement for reducers in development
 */
if (process.env.NODE_ENV !== 'production' && module.hot) {
  module.hot.accept('./slices/auth.slice', () => store.replaceReducer(rootReducer));
  module.hot.accept('./slices/content.slice', () => store.replaceReducer(rootReducer));
  module.hot.accept('./slices/family.slice', () => store.replaceReducer(rootReducer));
  module.hot.accept('./slices/gazette.slice', () => store.replaceReducer(rootReducer));
  module.hot.accept('./slices/payment.slice', () => store.replaceReducer(rootReducer));
}

/**
 * Export TypeScript types for store and state
 */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Type guard to check if state is RootState
 */
export const isRootState = (state: any): state is RootState => {
  return (
    state &&
    typeof state === 'object' &&
    'auth' in state &&
    'content' in state &&
    'family' in state &&
    'gazette' in state &&
    'payment' in state
  );
};