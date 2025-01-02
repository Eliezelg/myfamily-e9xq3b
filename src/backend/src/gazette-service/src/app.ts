/**
 * @fileoverview Main application entry point for the gazette service implementing
 * comprehensive security, monitoring, and performance optimizations
 * @version 1.0.0
 */

import { NestFactory } from '@nestjs/core'; // ^9.0.0
import { 
  ValidationPipe, 
  Logger,
  RequestMethod,
  VersioningType
} from '@nestjs/common'; // ^9.0.0
import { 
  SwaggerModule, 
  DocumentBuilder 
} from '@nestjs/swagger'; // ^6.0.0
import helmet from 'helmet'; // ^6.0.0
import compression from 'compression'; // ^1.7.4
import { GazetteController } from './controllers/gazette.controller';
import printConfig from './config/print.config';
import shippingConfig from './config/shipping.config';

// Global Constants
const PORT = process.env.GAZETTE_SERVICE_PORT || 3000;
const API_VERSION = 'v1';
const REQUEST_TIMEOUT = 60000; // 60 seconds
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100;

/**
 * Root module for gazette service configuration
 */
@Module({
  imports: [
    // Core service modules
    ConfigModule.forRoot({
      isGlobal: true,
      load: [printConfig, shippingConfig]
    }),
    ThrottlerModule.forRoot({
      ttl: RATE_LIMIT_WINDOW,
      limit: RATE_LIMIT_MAX,
    }),
    // Monitoring and tracing
    PrometheusModule.register(),
    OpenTelemetryModule.forRoot(),
    // Security modules
    HelmetModule.forRoot(),
    CorsModule.forRoot()
  ],
  controllers: [GazetteController],
  providers: [
    // Global guards
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor
    }
  ]
})
export class GazetteModule {}

/**
 * Application bootstrap with comprehensive configuration
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('GazetteService');
  
  try {
    // Create NestJS application
    const app = await NestFactory.create(GazetteModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      bufferLogs: true
    });

    // API versioning
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: API_VERSION
    });

    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false
      },
      validationError: {
        target: false,
        value: false
      }
    }));

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: 'same-site' },
      hidePoweredBy: true
    }));

    // Response compression
    app.use(compression({
      threshold: 0,
      level: 6,
      memLevel: 8
    }));

    // CORS configuration
    app.enableCors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      credentials: true,
      maxAge: 3600
    });

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('Gazette Service API')
      .setDescription('API for gazette generation and distribution')
      .setVersion(API_VERSION)
      .addBearerAuth()
      .addTag('gazettes')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    // Health checks
    const health = app.get(TerminusModule);
    app.use('/health', health.check([
      () => ({ database: DatabaseHealthIndicator }),
      () => ({ redis: RedisHealthIndicator }),
      () => ({ print: PrintServiceHealthIndicator }),
      () => ({ shipping: ShippingServiceHealthIndicator })
    ]));

    // Graceful shutdown
    app.enableShutdownHooks();
    
    // Start server
    await app.listen(PORT);
    logger.log(`Gazette service running on port ${PORT}`);

  } catch (error) {
    logger.error(`Failed to start gazette service: ${error.message}`);
    process.exit(1);
  }
}

// Start application
bootstrap().catch(error => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});