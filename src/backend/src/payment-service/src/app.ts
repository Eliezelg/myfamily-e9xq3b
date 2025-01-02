/**
 * @fileoverview Main application entry point for the payment microservice
 * @version 1.0.0
 */

import express, { Application, NextFunction, Request, Response } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^6.0.1
import cors from 'cors'; // ^2.8.5
import { Registry, collectDefaultMetrics } from 'prom-client'; // ^14.0.1
import { RateLimiterMemory } from 'rate-limiter-flexible'; // ^2.4.1
import { PaymentController } from './controllers/payment.controller';
import { createLogger, transports, format } from 'winston';
import { Container } from 'inversify';
import 'reflect-metadata';

// Environment variables
const PORT = process.env.PAYMENT_SERVICE_PORT || 3003;
const NODE_ENV = process.env.NODE_ENV || 'development';
const METRICS_ENABLED = process.env.METRICS_ENABLED === 'true';

// Constants for rate limiting
const GLOBAL_RATE_LIMIT = {
  points: 1000,
  duration: 60 * 15 // 15 minutes
};

export class PaymentServiceApp {
  private app: Application;
  private readonly metricsRegistry: Registry;
  private readonly container: Container;
  private readonly logger: any;

  constructor() {
    this.app = express();
    this.metricsRegistry = new Registry();
    this.container = new Container();
    this.logger = this.initializeLogger();
    this.initializeContainer();
  }

  /**
   * Initialize Winston logger with appropriate configuration
   */
  private initializeLogger() {
    return createLogger({
      level: NODE_ENV === 'production' ? 'info' : 'debug',
      format: format.combine(
        format.timestamp(),
        format.json()
      ),
      transports: [
        new transports.Console(),
        new transports.File({ filename: 'payment-service-error.log', level: 'error' }),
        new transports.File({ filename: 'payment-service-combined.log' })
      ]
    });
  }

  /**
   * Initialize Inversify container with service bindings
   */
  private initializeContainer(): void {
    this.container.bind('Logger').toConstantValue(this.logger);
    this.container.bind('Metrics').toConstantValue(this.metricsRegistry);
    this.container.bind(PaymentController).toSelf();
  }

  /**
   * Initialize and configure the Express application
   */
  private async bootstrapServer(): Promise<void> {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration with regional settings
    this.app.use(cors({
      origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-Request-Id'],
      credentials: true,
      maxAge: 600 // 10 minutes
    }));

    // Body parser with size limits
    this.app.use(express.json({ limit: '10kb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10kb' }));

    // Global rate limiter
    const limiter = new RateLimiterMemory(GLOBAL_RATE_LIMIT);
    this.app.use(async (req: Request, res: Response, next: NextFunction) => {
      try {
        await limiter.consume(req.ip);
        next();
      } catch {
        res.status(429).json({ error: 'Too Many Requests' });
      }
    });

    // Metrics collection
    if (METRICS_ENABLED) {
      collectDefaultMetrics({ register: this.metricsRegistry });
      this.app.get('/metrics', async (req: Request, res: Response) => {
        res.set('Content-Type', this.metricsRegistry.contentType);
        res.send(await this.metricsRegistry.metrics());
      });
    }

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-Id', req.id);
      next();
    });

    // Controller routes
    const paymentController = this.container.get(PaymentController);
    this.app.use('/api/v1/payments', paymentController.router);

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Error handling middleware
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        requestId: req.id
      });

      res.status(500).json({
        error: NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
        requestId: req.id
      });
    });
  }

  /**
   * Start the HTTP server and initialize monitoring
   */
  private async startServer(): Promise<void> {
    try {
      await this.bootstrapServer();

      const server = this.app.listen(PORT, () => {
        this.logger.info(`Payment service started`, {
          port: PORT,
          environment: NODE_ENV,
          metricsEnabled: METRICS_ENABLED
        });
      });

      // Graceful shutdown
      const shutdown = async () => {
        this.logger.info('Shutting down payment service...');
        server.close(() => {
          this.logger.info('Server closed');
          process.exit(0);
        });
      };

      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);

    } catch (error) {
      this.logger.error('Failed to start server', { error });
      process.exit(1);
    }
  }

  /**
   * Initialize and start the payment service
   */
  public async initialize(): Promise<void> {
    try {
      await this.startServer();
    } catch (error) {
      this.logger.error('Failed to initialize payment service', { error });
      throw error;
    }
  }
}

// Create and export default instance
export default new PaymentServiceApp();