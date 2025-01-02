/**
 * Main application entry point for the content microservice
 * Implements comprehensive content processing with multi-language support,
 * print-ready validation, and enhanced security features
 * @version 1.0.0
 */

// External imports
import { NestFactory } from '@nestjs/core'; // ^9.0.0
import { ValidationPipe } from '@nestjs/common'; // ^9.0.0
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'; // ^6.0.0
import helmet from 'helmet'; // ^6.0.0
import rateLimit from 'express-rate-limit'; // ^6.0.0
import compression from 'compression'; // ^6.0.0
import { json } from 'express';

// Internal imports
import { ContentController } from './controllers/content.controller';
import { s3Config } from './config/s3.config';
import { sharpConfig } from './config/sharp.config';
import { Logger } from '../../shared/utils/logger.util';

// Global constants
const PORT = process.env.PORT || 3002;
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || 100;
const SHUTDOWN_TIMEOUT = process.env.SHUTDOWN_TIMEOUT || 10000;

/**
 * Configure Swagger documentation with security schemes
 */
function setupSwagger(app: any): void {
  const config = new DocumentBuilder()
    .setTitle('MyFamily Content Service')
    .setDescription('API for content processing, storage, and print-ready validation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('content')
    .addServer(process.env.API_BASE_URL || 'http://localhost:3002')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}

/**
 * Bootstrap the content service application
 */
async function bootstrap(): Promise<void> {
  // Initialize logger
  const logger = Logger.getInstance({
    service: 'content-service',
    level: 'info',
    enableConsole: true,
    enableFile: true,
    enableElk: true
  });

  try {
    // Create NestJS application
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
      cors: {
        origin: CORS_ORIGINS,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Authorization', 'Content-Type'],
        exposedHeaders: ['Content-Disposition']
      }
    });

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', `https://${s3Config.cloudFront.domain}`]
        }
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // Rate limiting
    app.use(rateLimit({
      windowMs: Number(RATE_LIMIT_WINDOW),
      max: Number(RATE_LIMIT_MAX),
      message: 'Too many requests from this IP, please try again later'
    }));

    // Request parsing and compression
    app.use(json({ limit: '10mb' }));
    app.use(compression());

    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false
      }
    }));

    // Setup Swagger documentation
    setupSwagger(app);

    // Graceful shutdown handler
    app.enableShutdownHooks();
    const signals = ['SIGTERM', 'SIGINT'];
    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, starting graceful shutdown`);
        
        setTimeout(() => {
          logger.error('Forceful shutdown due to timeout');
          process.exit(1);
        }, SHUTDOWN_TIMEOUT);

        await app.close();
        logger.info('Application shutdown complete');
        process.exit(0);
      });
    });

    // Start server
    await app.listen(PORT);
    logger.info(`Content service started on port ${PORT}`, {
      port: PORT,
      environment: process.env.NODE_ENV,
      corsOrigins: CORS_ORIGINS
    });

  } catch (error) {
    logger.error('Failed to start content service', {}, error as Error);
    process.exit(1);
  }
}

// Start application
bootstrap();