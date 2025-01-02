/**
 * Custom React hook for managing authentication state and operations
 * Implements JWT-based authentication, OAuth, 2FA, and security monitoring
 * @version 1.0.0
 */

import { useCallback, useEffect } from 'react'; // v18.2.0
import { useDispatch, useSelector } from 'react-redux'; // v8.0.5
import { ILoginCredentials, IAuthResponse } from '../interfaces/auth.interface';
import { 
  authActions, 
  authSelectors,
  loginAsync,
  refreshTokenAsync,
  updateLastActivity,
  logout as logoutAction
} from '../store/slices/auth.slice';

// Security monitoring constants
const ACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
const MAX_LOGIN_ATTEMPTS = 5;
const SECURITY_LOG_RETENTION = 100;

// Security event types
interface ISecurityEvent {
  type: 'LOGIN_ATTEMPT' | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | '2FA_ATTEMPT' | 
        'TOKEN_REFRESH' | 'SESSION_TIMEOUT' | 'SUSPICIOUS_ACTIVITY';
  timestamp: Date;
  details: Record<string, any>;
}

// Session status type
interface ISessionStatus {
  isActive: boolean;
  lastActivity: Date | null;
  expiresAt: Date | null;
  timeUntilExpiry: number;
}

/**
 * Custom hook for authentication state and operations with security monitoring
 */
export function useAuth() {
  const dispatch = useDispatch();
  
  // Selectors
  const user = useSelector(authSelectors.selectUser);
  const isAuthenticated = useSelector(authSelectors.selectIsAuthenticated);
  const requires2FA = useSelector(authSelectors.selectRequires2FA);
  const sessionExpiry = useSelector(authSelectors.selectSessionExpiry);
  const lastActivity = useSelector(authSelectors.selectLastActivity);

  // Security event logging
  const [securityEvents, setSecurityEvents] = useState<ISecurityEvent[]>([]);

  /**
   * Logs security events with retention limit
   */
  const logSecurityEvent = useCallback((event: ISecurityEvent) => {
    setSecurityEvents(prev => {
      const updated = [event, ...prev].slice(0, SECURITY_LOG_RETENTION);
      // Log critical security events to monitoring service
      if (event.type.includes('FAILURE') || event.type === 'SUSPICIOUS_ACTIVITY') {
        console.error('Security Event:', event);
        // TODO: Implement external security monitoring integration
      }
      return updated;
    });
  }, []);

  /**
   * Handles user login with security monitoring
   */
  const login = useCallback(async (credentials: ILoginCredentials) => {
    try {
      logSecurityEvent({
        type: 'LOGIN_ATTEMPT',
        timestamp: new Date(),
        details: { email: credentials.email }
      });

      const result = await dispatch(loginAsync(credentials)).unwrap();
      
      logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        timestamp: new Date(),
        details: { userId: result.user.id }
      });

      return result;
    } catch (error) {
      logSecurityEvent({
        type: 'LOGIN_FAILURE',
        timestamp: new Date(),
        details: { error: error.message }
      });
      throw error;
    }
  }, [dispatch, logSecurityEvent]);

  /**
   * Handles OAuth-based login
   */
  const loginWithOAuth = useCallback(async (provider: string, token: string) => {
    try {
      logSecurityEvent({
        type: 'LOGIN_ATTEMPT',
        timestamp: new Date(),
        details: { provider }
      });

      // Implement OAuth login logic
      const result = await dispatch(loginWithOAuthAsync({ provider, token })).unwrap();
      
      logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        timestamp: new Date(),
        details: { userId: result.user.id, provider }
      });

      return result;
    } catch (error) {
      logSecurityEvent({
        type: 'LOGIN_FAILURE',
        timestamp: new Date(),
        details: { provider, error: error.message }
      });
      throw error;
    }
  }, [dispatch, logSecurityEvent]);

  /**
   * Handles 2FA verification
   */
  const verify2FA = useCallback(async (code: string) => {
    try {
      logSecurityEvent({
        type: '2FA_ATTEMPT',
        timestamp: new Date(),
        details: { userId: user?.id }
      });

      const result = await dispatch(verify2FAAsync(code)).unwrap();
      return result;
    } catch (error) {
      logSecurityEvent({
        type: 'LOGIN_FAILURE',
        timestamp: new Date(),
        details: { error: error.message, type: '2FA' }
      });
      throw error;
    }
  }, [dispatch, user, logSecurityEvent]);

  /**
   * Handles secure logout
   */
  const logout = useCallback(async () => {
    try {
      await dispatch(logoutAction());
      // Clear sensitive data from local storage
      localStorage.removeItem('lastActivity');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [dispatch]);

  /**
   * Manages session monitoring and token refresh
   */
  useEffect(() => {
    if (!isAuthenticated || !sessionExpiry) return;

    const activityInterval = setInterval(() => {
      const now = new Date();
      const lastActivityTime = lastActivity ? new Date(lastActivity) : now;
      
      // Check for inactivity
      if (now.getTime() - lastActivityTime.getTime() > ACTIVITY_TIMEOUT) {
        logSecurityEvent({
          type: 'SESSION_TIMEOUT',
          timestamp: now,
          details: { userId: user?.id }
        });
        dispatch(logoutAction());
        return;
      }

      // Check for token refresh need
      const expiryTime = new Date(sessionExpiry);
      if (expiryTime.getTime() - now.getTime() < TOKEN_REFRESH_THRESHOLD) {
        dispatch(refreshTokenAsync());
        logSecurityEvent({
          type: 'TOKEN_REFRESH',
          timestamp: now,
          details: { userId: user?.id }
        });
      }

      dispatch(updateLastActivity());
    }, 60000); // Check every minute

    return () => clearInterval(activityInterval);
  }, [isAuthenticated, sessionExpiry, lastActivity, dispatch, user, logSecurityEvent]);

  /**
   * Returns session status information
   */
  const getSessionStatus = useCallback((): ISessionStatus => {
    if (!isAuthenticated || !sessionExpiry) {
      return {
        isActive: false,
        lastActivity: null,
        expiresAt: null,
        timeUntilExpiry: 0
      };
    }

    const now = new Date();
    const expiryTime = new Date(sessionExpiry);

    return {
      isActive: true,
      lastActivity: lastActivity ? new Date(lastActivity) : null,
      expiresAt: expiryTime,
      timeUntilExpiry: Math.max(0, expiryTime.getTime() - now.getTime())
    };
  }, [isAuthenticated, sessionExpiry, lastActivity]);

  return {
    user,
    isAuthenticated,
    requires2FA,
    sessionStatus: getSessionStatus(),
    securityEvents,
    login,
    loginWithOAuth,
    verify2FA,
    logout,
    refreshSession: () => dispatch(refreshTokenAsync())
  };
}