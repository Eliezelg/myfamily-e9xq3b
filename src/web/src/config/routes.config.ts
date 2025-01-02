/**
 * @fileoverview Route configuration for MyFamily web application
 * Implements secure route guards, role-based access control, and optimized navigation
 * @version 1.0.0
 */

import { ROUTES } from '../constants/routes.constants';
import { UserRole } from '../../../backend/src/shared/interfaces/user.interface';
import type { Router } from 'react-router-dom';

/**
 * Route metadata interface for enhanced navigation and analytics
 */
interface RouteMetadata {
  breadcrumbs: Array<{ label: string; path: string }>;
  analyticsKey: string;
  loadStrategy: 'eager' | 'lazy';
  rateLimit: string;
}

/**
 * Role hierarchy configuration for inheritance-based access control
 */
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.SYSTEM_ADMIN]: [UserRole.FAMILY_ADMIN, UserRole.CONTENT_CONTRIBUTOR, UserRole.MEMBER],
  [UserRole.FAMILY_ADMIN]: [UserRole.CONTENT_CONTRIBUTOR, UserRole.MEMBER],
  [UserRole.CONTENT_CONTRIBUTOR]: [UserRole.MEMBER],
  [UserRole.MEMBER]: []
};

/**
 * Validates user authorization for route access based on role hierarchy
 * @param requiredRole - Required role for route access
 * @param userRole - Current user's role
 * @returns boolean indicating authorization status
 */
const isAuthorized = (requiredRole: UserRole, userRole: UserRole): boolean => {
  if (requiredRole === userRole) return true;
  return ROLE_HIERARCHY[userRole]?.includes(requiredRole) || false;
};

/**
 * Retrieves metadata for route including breadcrumbs and analytics info
 * @param routePath - Current route path
 * @returns RouteMetadata object
 */
const getRouteMetadata = (routePath: string): RouteMetadata => {
  const pathSegments = routePath.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => ({
    label: segment.charAt(0).toUpperCase() + segment.slice(1),
    path: '/' + pathSegments.slice(0, index + 1).join('/')
  }));

  return {
    breadcrumbs,
    analyticsKey: pathSegments.join('_'),
    loadStrategy: routePath === ROUTES.DASHBOARD.ROOT ? 'eager' : 'lazy',
    rateLimit: '100/minute'
  };
};

/**
 * Route configuration object with comprehensive security and navigation settings
 */
export const routeConfig = {
  defaultRoute: ROUTES.DASHBOARD.ROOT,
  
  // Public routes accessible without authentication
  publicRoutes: [
    ROUTES.AUTH.LOGIN,
    ROUTES.AUTH.REGISTER,
    ROUTES.AUTH.FORGOT_PASSWORD,
    ROUTES.AUTH.VERIFY_EMAIL,
    ROUTES.AUTH.RESET_PASSWORD,
    ROUTES.AUTH.TWO_FACTOR
  ],

  // Protected routes with role-based access control
  privateRoutes: {
    dashboard: {
      path: `${ROUTES.DASHBOARD.ROOT}/*`,
      roles: [UserRole.MEMBER, UserRole.CONTENT_CONTRIBUTOR, UserRole.FAMILY_ADMIN, UserRole.SYSTEM_ADMIN],
      loadStrategy: 'eager',
      rateLimit: '100/minute',
      children: [
        { path: 'home', element: 'DashboardHome' },
        { path: 'activity', element: 'ActivityFeed' },
        { path: 'notifications', element: 'Notifications' },
        { path: 'quick-upload', element: 'QuickUpload' }
      ]
    },
    content: {
      path: `${ROUTES.CONTENT.ROOT}/*`,
      roles: [UserRole.CONTENT_CONTRIBUTOR, UserRole.FAMILY_ADMIN, UserRole.SYSTEM_ADMIN],
      loadStrategy: 'lazy',
      rateLimit: '50/minute',
      children: [
        { path: 'upload', element: 'ContentUpload' },
        { path: 'edit/:id', element: 'ContentEdit' },
        { path: 'view/:id', element: 'ContentView' },
        { path: 'gallery', element: 'ContentGallery' },
        { path: 'drafts', element: 'ContentDrafts' }
      ]
    },
    gazette: {
      path: `${ROUTES.GAZETTE.ROOT}/*`,
      roles: [UserRole.MEMBER, UserRole.CONTENT_CONTRIBUTOR, UserRole.FAMILY_ADMIN, UserRole.SYSTEM_ADMIN],
      loadStrategy: 'lazy',
      rateLimit: '30/minute',
      children: [
        { path: 'preview/:id', element: 'GazettePreview' },
        { path: 'history', element: 'GazetteHistory' },
        { path: 'settings', element: 'GazetteSettings' },
        { path: 'template', element: 'GazetteTemplate' },
        { path: 'schedule', element: 'GazetteSchedule' }
      ]
    },
    family: {
      path: `${ROUTES.FAMILY.ROOT}/*`,
      roles: [UserRole.FAMILY_ADMIN, UserRole.SYSTEM_ADMIN],
      loadStrategy: 'lazy',
      rateLimit: '20/minute',
      children: [
        { path: 'manage', element: 'FamilyManage' },
        { path: 'members', element: 'FamilyMembers' },
        { path: 'invite', element: 'FamilyInvite' },
        { path: 'roles', element: 'FamilyRoles' },
        { path: 'preferences', element: 'FamilyPreferences' }
      ]
    },
    payment: {
      path: `${ROUTES.PAYMENT.ROOT}/*`,
      roles: [UserRole.FAMILY_ADMIN, UserRole.SYSTEM_ADMIN],
      loadStrategy: 'lazy',
      rateLimit: '10/minute',
      children: [
        { path: 'pool', element: 'PaymentPool' },
        { path: 'transactions', element: 'PaymentTransactions' },
        { path: 'add-funds', element: 'PaymentAddFunds' },
        { path: 'methods', element: 'PaymentMethods' },
        { path: 'billing', element: 'PaymentBilling' }
      ]
    }
  },

  // Error routes for handling various error states
  errorRoutes: {
    notFound: { path: '*', element: 'NotFound' },
    forbidden: { path: '/403', element: 'Forbidden' },
    serverError: { path: '/500', element: 'ServerError' },
    maintenance: { path: '/maintenance', element: 'Maintenance' }
  },

  // Utility functions for route management
  utils: {
    isAuthorized,
    getRouteMetadata
  }
};

export type RouteConfig = typeof routeConfig;
export { isAuthorized, getRouteMetadata };