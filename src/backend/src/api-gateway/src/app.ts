/**
 * @fileoverview Main application file for the API Gateway service
 * Implements comprehensive API Gateway pattern with enhanced security,
 * monitoring, and resilience features
 * Version: 1.0.0
 */

import express from 'express'; // ^4.18.2
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^6.0.1
import compression from 'compression'; // ^1.7.4

import { corsConfig } from './config/cors.config';
import { 
  familiesRateLimit, 
  contentRateLimit, 
  gazettesRateLimit, 
  poolRateLimit 
} from './config/rate-limit.config';
import configureRoutes from './config/routes.config';
import { authenticate } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error.middleware';
import { requestLoggingMiddleware } from './middleware/logging.middleware';
import { Logger } from '../../shared/utils/logger.util';

// Initialize Express application
const app = express();

// Initialize logger
const logger = Logger.getInstance({
  service: 'api-gateway',
  level: process.env.LOG_LEVEL || 'info',
  enableConsole: true,
  enableFile: true,
  enableElk: true,
  elkHost: process.env.ELK_HOST,
  elkPort: parseInt(process.env.ELK_PORT || '9200', 10),
  enablePiiFiltering: true
});

/**
 * Initialize and configure all middleware for the Express application
 * @param app Express application instance
 */
function initializeMiddleware(app: express.Application): void {
  // Enhanced security headers with strict CSP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
  }));

  // CORS configuration with strict origin validation
  app.use(cors(corsConfig));

  // Request parsing with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Response compression
  app.use(compression());

  // Request logging with correlation IDs
  app.use(requestLoggingMiddleware);

  // Endpoint-specific rate limiting
  app.use('/api/v1/families', familiesRateLimit);
  app.use('/api/v1/content', contentRateLimit);
  app.use('/api/v1/gazettes', gazettesRateLimit);
  app.use('/api/v1/pool', poolRateLimit);

  // JWT authentication with 2FA support
  app.use('/api/v1', authenticate);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Configure API routes
  configureRoutes(app);

  // Global error handler
  app.use(errorHandler);
}

/**
 * Start the Express server with enhanced error handling and graceful shutdown
 * @param app Express application instance
 */
async function startServer(app: express.Application): Promise<void> {
  try {
    const port = process.env.PORT || 3000;
    
    // Configure server timeouts
    const server = app.listen(port, () => {
      logger.info('API Gateway started successfully', {
        port,
        environment: process.env.NODE_ENV,
        nodeVersion: process.version
      });
    });

    server.keepAliveTimeout = 120000;
    server.headersTimeout = 120000;

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received - initiating graceful shutdown`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection', {
        reason,
        promise,
        stack: new Error().stack
      });
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', {
        error,
        stack: error.stack
      });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start API Gateway', {
      error,
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Initialize middleware
initializeMiddleware(app);

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer(app);
}

export { app };