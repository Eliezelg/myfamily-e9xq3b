/**
 * @fileoverview API Gateway route configuration with enhanced security and monitoring
 * Implements comprehensive routing with middleware chains for authentication,
 * authorization, validation, rate limiting, and audit logging
 * Version: 1.0.0
 */

import express from 'express'; // ^4.18.2
import rateLimit from 'express-rate-limit'; // ^6.7.0
import helmet from 'helmet'; // ^6.0.1
import compression from 'compression'; // ^1.7.4

import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { errorHandler } from '../middleware/error.middleware';
import { UserRole } from '../../../shared/interfaces/user.interface';
import { Logger } from '../../../shared/utils/logger.util';

// API versioning and path constants
const API_VERSION = 'v1';
const BASE_PATH = `/api/${API_VERSION}`;
const AUTH_PATH = '/auth';
const FAMILY_PATH = '/families';
const CONTENT_PATH = '/content';
const GAZETTE_PATH = '/gazettes';
const PAYMENT_PATH = '/payments';

// Rate limiting configurations per role
const RATE_LIMIT_WINDOW_MS = 900000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = {
  [UserRole.SYSTEM_ADMIN]: 10000,
  [UserRole.FAMILY_ADMIN]: 5000,
  [UserRole.CONTENT_CONTRIBUTOR]: 2000,
  [UserRole.MEMBER]: 1000
};

/**
 * Configures all API routes with enhanced security, monitoring, and validation
 * @param app Express application instance
 */
export default function configureRoutes(app: express.Application): void {
  const logger = Logger.getInstance({
    service: 'api-gateway',
    level: 'info',
    enableConsole: true,
    enableFile: true,
    enableElk: true
  });

  // Global middleware configuration
  app.use(compression());
  app.use(helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: true,
    xssFilter: true
  }));

  // Request correlation ID middleware
  app.use((req, res, next) => {
    req.headers['x-correlation-id'] = req.headers['x-correlation-id'] || 
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    next();
  });

  // Configure authentication routes
  configureAuthRoutes(app);

  // Configure family management routes
  configureFamilyRoutes(app);

  // Configure content management routes
  configureContentRoutes(app);

  // Configure gazette management routes
  configureGazetteRoutes(app);

  // Configure payment management routes
  configurePaymentRoutes(app);

  // Global error handler
  app.use(errorHandler);

  logger.info('API routes configured successfully', {
    apiVersion: API_VERSION,
    basePath: BASE_PATH
  });
}

/**
 * Configures authentication routes with enhanced security
 */
function configureAuthRoutes(app: express.Application): void {
  const router = express.Router();
  const authRateLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: 100, // Stricter limit for auth endpoints
    message: 'Too many authentication attempts, please try again later'
  });

  router.post('/login', 
    authRateLimiter,
    validateRequest('loginSchema'),
    (req, res) => {
      // Login handler implementation
    }
  );

  router.post('/register',
    authRateLimiter,
    validateRequest('registrationSchema'),
    (req, res) => {
      // Registration handler implementation
    }
  );

  router.post('/refresh-token',
    authRateLimiter,
    validateRequest('refreshTokenSchema'),
    (req, res) => {
      // Token refresh handler implementation
    }
  );

  app.use(`${BASE_PATH}${AUTH_PATH}`, router);
}

/**
 * Configures family management routes with role-based access
 */
function configureFamilyRoutes(app: express.Application): void {
  const router = express.Router();

  router.use(authenticate);

  router.get('/',
    authorize([UserRole.FAMILY_ADMIN, UserRole.MEMBER]),
    validateRequest('familyListSchema'),
    (req, res) => {
      // Family list handler implementation
    }
  );

  router.post('/',
    authorize([UserRole.FAMILY_ADMIN]),
    validateRequest('familyCreateSchema'),
    (req, res) => {
      // Family creation handler implementation
    }
  );

  app.use(`${BASE_PATH}${FAMILY_PATH}`, router);
}

/**
 * Configures content management routes with upload validation
 */
function configureContentRoutes(app: express.Application): void {
  const router = express.Router();

  router.use(authenticate);

  router.post('/upload',
    authorize([UserRole.CONTENT_CONTRIBUTOR, UserRole.FAMILY_ADMIN]),
    validateRequest('contentUploadSchema'),
    (req, res) => {
      // Content upload handler implementation
    }
  );

  router.get('/:familyId',
    authorize([UserRole.MEMBER]),
    validateRequest('contentListSchema'),
    (req, res) => {
      // Content list handler implementation
    }
  );

  app.use(`${BASE_PATH}${CONTENT_PATH}`, router);
}

/**
 * Configures gazette management routes with approval workflow
 */
function configureGazetteRoutes(app: express.Application): void {
  const router = express.Router();

  router.use(authenticate);

  router.post('/generate',
    authorize([UserRole.FAMILY_ADMIN]),
    validateRequest('gazetteGenerationSchema'),
    (req, res) => {
      // Gazette generation handler implementation
    }
  );

  router.get('/:familyId/preview',
    authorize([UserRole.MEMBER]),
    validateRequest('gazettePreviewSchema'),
    (req, res) => {
      // Gazette preview handler implementation
    }
  );

  app.use(`${BASE_PATH}${GAZETTE_PATH}`, router);
}

/**
 * Configures payment management routes with enhanced security
 */
function configurePaymentRoutes(app: express.Application): void {
  const router = express.Router();

  router.use(authenticate);

  router.post('/pool/topup',
    authorize([UserRole.FAMILY_ADMIN]),
    validateRequest('poolTopupSchema'),
    (req, res) => {
      // Pool top-up handler implementation
    }
  );

  router.get('/pool/balance',
    authorize([UserRole.MEMBER]),
    validateRequest('poolBalanceSchema'),
    (req, res) => {
      // Pool balance handler implementation
    }
  );

  app.use(`${BASE_PATH}${PAYMENT_PATH}`, router);
}