/**
 * Enhanced Authentication Service Entry Point
 * Implements secure authentication strategies with comprehensive security features
 * @see Technical Specifications/7.1.1 Authentication Methods
 * @version 1.0.0
 */

import express, { Application } from 'express'; // ^4.18.2
import passport from 'passport'; // ^0.6.0
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'; // ^4.0.1
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'; // ^2.0.0
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^6.0.1
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { jwtConfig } from './config/jwt.config';
import { oauthConfig } from './config/oauth.config';
import { AuthController } from './controllers/auth.controller';
import { Logger } from '../../../shared/utils/logger.util';

// Environment variables with secure defaults
const PORT = process.env.AUTH_SERVICE_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || 100;

/**
 * Enhanced authentication service application class
 * Implements comprehensive security features and monitoring
 */
export class App {
  private readonly express: Application;
  private readonly logger: Logger;
  private readonly authController: AuthController;

  constructor() {
    this.express = express();
    this.logger = Logger.getInstance({
      service: 'auth-service',
      level: 'info',
      enableConsole: true,
      enableFile: true,
      enableElk: NODE_ENV === 'production',
      enablePiiFiltering: true
    });
    this.authController = new AuthController();

    this.configurePassport();
    this.setupMiddleware(this.express);
    this.setupRoutes(this.express);
  }

  /**
   * Configures enhanced passport authentication strategies
   */
  private configurePassport(): void {
    // JWT Strategy Configuration
    passport.use(new JwtStrategy({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtConfig.secret,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithms: [jwtConfig.algorithm]
    }, async (payload, done) => {
      try {
        // Verify token is not blacklisted
        const isBlacklisted = await jwtConfig.blacklistCheck(payload.jti);
        if (isBlacklisted) {
          return done(null, false);
        }
        return done(null, payload);
      } catch (error) {
        return done(error, false);
      }
    }));

    // Google OAuth Strategy with PKCE
    passport.use(new GoogleStrategy({
      clientID: oauthConfig.google.clientID,
      clientSecret: oauthConfig.google.clientSecret,
      callbackURL: oauthConfig.google.callbackURL,
      passReqToCallback: true,
      scope: ['profile', 'email']
    }, this.authController.handleGoogleAuth));

    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await this.authController.getUserById(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  /**
   * Sets up comprehensive Express middleware chain
   */
  private setupMiddleware(app: Application): void {
    // Security Headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: 'same-site' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      ieNoOpen: true,
      noSniff: true,
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true
    }));

    // CORS Configuration
    app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 600, // 10 minutes
      exposedHeaders: ['X-Request-ID']
    }));

    // Rate Limiting
    app.use(rateLimit({
      windowMs: Number(RATE_LIMIT_WINDOW),
      max: Number(RATE_LIMIT_MAX),
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests, please try again later'
    }));

    // Request Parsing
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true, limit: '10kb' }));

    // Passport Initialization
    app.use(passport.initialize());

    // Request Logging
    app.use((req, res, next) => {
      this.logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      next();
    });
  }

  /**
   * Sets up authentication routes with security features
   */
  private setupRoutes(app: Application): void {
    // Health Check
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy' });
    });

    // Authentication Routes
    app.post('/auth/register', this.authController.register);
    app.post('/auth/login', this.authController.login);
    app.post('/auth/verify-2fa', this.authController.verify2FA);
    app.get('/auth/google', passport.authenticate('google'));
    app.get('/auth/google/callback', passport.authenticate('google', { session: false }));

    // Error Handling
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
      });
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Starts the authentication service with enhanced security
   */
  public async start(): Promise<void> {
    try {
      this.express.listen(PORT, () => {
        this.logger.info(`Authentication service started`, {
          port: PORT,
          environment: NODE_ENV,
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      this.logger.error('Failed to start authentication service', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    }
  }
}