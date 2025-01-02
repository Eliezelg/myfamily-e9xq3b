/**
 * Enterprise-grade Header Component
 * Version: 1.0.0
 * 
 * Implements Material Design 3.0 guidelines with enhanced accessibility,
 * RTL support, and comprehensive security features.
 */

import React, { useCallback, useEffect, useMemo, Suspense } from 'react'; // ^18.2.0
import { useTranslation } from 'react-i18next'; // ^12.0.0
import {
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material'; // ^5.11.0
import {
  AccountCircle,
  Dashboard,
  Settings,
  Logout,
  Warning
} from '@mui/icons-material'; // ^5.11.0

import {
  HeaderContainer,
  Logo,
  Navigation,
  UserSection
} from './Header.styles';
import FamilySelector from '../../family/FamilySelector';
import { useAuth } from '../../../hooks/useAuth';

/**
 * Props interface for Header component
 */
interface HeaderProps {
  className?: string;
  onSessionExpired?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Enhanced Header component with comprehensive security and accessibility features
 */
const Header: React.FC<HeaderProps> = ({
  className,
  onSessionExpired,
  onError
}) => {
  // Hooks initialization
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, sessionStatus, logout, refreshSession } = useAuth();

  /**
   * Memoized session monitoring
   */
  const sessionInfo = useMemo(() => ({
    isActive: sessionStatus.isActive,
    timeUntilExpiry: sessionStatus.timeUntilExpiry,
    warningThreshold: 5 * 60 * 1000 // 5 minutes
  }), [sessionStatus]);

  /**
   * Enhanced logout handler with cleanup
   */
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      // Clear any sensitive data from memory
      window.sessionStorage.clear();
      window.location.href = '/login';
    } catch (error) {
      onError?.(error as Error);
      console.error('Logout failed:', error);
    }
  }, [logout, onError]);

  /**
   * Session monitoring effect
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = () => {
      if (!sessionInfo.isActive) {
        onSessionExpired?.();
        handleLogout();
        return;
      }

      if (sessionInfo.timeUntilExpiry < sessionInfo.warningThreshold) {
        refreshSession().catch((error) => {
          console.error('Session refresh failed:', error);
          onError?.(error as Error);
        });
      }
    };

    const intervalId = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [isAuthenticated, sessionInfo, refreshSession, handleLogout, onSessionExpired, onError]);

  /**
   * Keyboard navigation handler
   */
  const handleKeyNavigation = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      const activeElement = document.activeElement as HTMLElement;
      activeElement?.blur();
    }
  }, []);

  /**
   * Render user profile section
   */
  const renderUserProfile = useMemo(() => {
    if (!user) return null;

    return (
      <UserSection>
        <Tooltip title={t('header.profile')} arrow>
          <IconButton
            aria-label={t('header.profile')}
            color="inherit"
            edge="end"
          >
            <AccountCircle />
          </IconButton>
        </Tooltip>
        <span className="user-name" aria-label={t('header.greeting', { name: user.firstName })}>
          {user.firstName} {user.lastName}
        </span>
      </UserSection>
    );
  }, [user, t]);

  /**
   * Render navigation actions
   */
  const renderActions = useMemo(() => (
    <Navigation role="navigation" aria-label={t('header.navigation')}>
      <Tooltip title={t('header.dashboard')} arrow>
        <IconButton
          aria-label={t('header.dashboard')}
          color="inherit"
          onClick={() => window.location.href = '/dashboard'}
        >
          <Dashboard />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('header.settings')} arrow>
        <IconButton
          aria-label={t('header.settings')}
          color="inherit"
          onClick={() => window.location.href = '/settings'}
        >
          <Settings />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('header.logout')} arrow>
        <IconButton
          aria-label={t('header.logout')}
          color="inherit"
          onClick={handleLogout}
        >
          <Logout />
        </IconButton>
      </Tooltip>
    </Navigation>
  ), [t, handleLogout]);

  /**
   * Render session warning if needed
   */
  const renderSessionWarning = useMemo(() => {
    if (!sessionInfo.isActive || sessionInfo.timeUntilExpiry > sessionInfo.warningThreshold) {
      return null;
    }

    return (
      <Tooltip title={t('header.sessionExpiring')} arrow>
        <Warning color="warning" />
      </Tooltip>
    );
  }, [sessionInfo, t]);

  return (
    <HeaderContainer
      className={className}
      role="banner"
      dir={i18n.dir()}
      onKeyDown={handleKeyNavigation}
      data-testid="main-header"
    >
      <Logo>
        <img
          src="/logo.svg"
          alt={t('header.logo')}
          height="32"
          width="auto"
        />
      </Logo>

      <Suspense fallback={<CircularProgress size={24} />}>
        <FamilySelector
          disabled={!isAuthenticated}
          showMetrics
          ariaLabel={t('header.familySelector')}
        />
      </Suspense>

      {isAuthenticated && (
        <>
          {renderActions}
          {renderUserProfile}
          {renderSessionWarning}
        </>
      )}
    </HeaderContainer>
  );
};

export default React.memo(Header);