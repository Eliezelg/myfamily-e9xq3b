/**
 * @fileoverview Route path constants for MyFamily web application
 * Provides centralized route management for web and mobile navigation
 * Supports internationalization, deep linking, and role-based access control
 * @version 1.0.0
 */

/**
 * Authentication related routes
 */
const AUTH = {
  ROOT: '/auth',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_EMAIL: '/auth/verify-email',
  TWO_FACTOR: '/auth/2fa',
} as const;

/**
 * Dashboard related routes
 */
const DASHBOARD = {
  ROOT: '/dashboard',
  HOME: '/dashboard/home',
  ACTIVITY: '/dashboard/activity',
  NOTIFICATIONS: '/dashboard/notifications',
  QUICK_UPLOAD: '/dashboard/quick-upload',
} as const;

/**
 * Content management routes
 */
const CONTENT = {
  ROOT: '/content',
  UPLOAD: '/content/upload',
  EDIT: '/content/edit/:id',
  VIEW: '/content/view/:id',
  GALLERY: '/content/gallery',
  DRAFTS: '/content/drafts',
} as const;

/**
 * Gazette management routes
 */
const GAZETTE = {
  ROOT: '/gazette',
  PREVIEW: '/gazette/preview/:id',
  HISTORY: '/gazette/history',
  SETTINGS: '/gazette/settings',
  TEMPLATE: '/gazette/template',
  SCHEDULE: '/gazette/schedule',
} as const;

/**
 * Family management routes
 */
const FAMILY = {
  ROOT: '/family',
  MANAGE: '/family/manage',
  MEMBERS: '/family/members',
  INVITE: '/family/invite',
  ROLES: '/family/roles',
  PREFERENCES: '/family/preferences',
} as const;

/**
 * Payment and financial routes
 */
const PAYMENT = {
  ROOT: '/payment',
  POOL: '/payment/pool',
  TRANSACTIONS: '/payment/transactions',
  ADD_FUNDS: '/payment/add-funds',
  METHODS: '/payment/methods',
  BILLING: '/payment/billing',
} as const;

/**
 * User settings routes
 */
const SETTINGS = {
  ROOT: '/settings',
  PROFILE: '/settings/profile',
  SECURITY: '/settings/security',
  LANGUAGE: '/settings/language',
  NOTIFICATIONS: '/settings/notifications',
  ACCESSIBILITY: '/settings/accessibility',
} as const;

/**
 * Error and system status routes
 */
const ERROR = {
  NOT_FOUND: '/404',
  FORBIDDEN: '/403',
  SERVER_ERROR: '/500',
  MAINTENANCE: '/maintenance',
} as const;

/**
 * Centralized route constants for the MyFamily application
 * Used by both web and mobile navigation systems
 * @constant
 */
export const ROUTES = {
  AUTH,
  DASHBOARD,
  CONTENT,
  GAZETTE,
  FAMILY,
  PAYMENT,
  SETTINGS,
  ERROR,
} as const;