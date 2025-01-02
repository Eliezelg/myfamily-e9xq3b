/**
 * Enhanced OAuth Service Implementation
 * Provides secure social authentication with comprehensive security features
 * @version 1.0.0
 */

import passport from 'passport'; // v0.6.0
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'; // v2.0.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // v2.4.1
import { Request, Response } from 'express';
import { createHash, randomBytes } from 'crypto';
import { oauthConfig } from '../config/oauth.config';
import { UserModel } from '../models/user.model';
import { IUser, UserRole, UserStatus } from '../../../shared/interfaces/user.interface';

/**
 * PKCE Configuration Interface
 */
interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
}

/**
 * Enhanced OAuth Service with comprehensive security features
 */
export class OAuthService {
  private userModel: UserModel;
  private rateLimiter: RateLimiterRedis;
  private readonly ALLOWED_DOMAINS = ['gmail.com', 'outlook.com']; // Configurable domain whitelist
  private readonly MAX_FAILED_ATTEMPTS = 3;
  private readonly BLOCK_DURATION = 15 * 60; // 15 minutes

  constructor(userModel: UserModel) {
    this.userModel = userModel;
    this.configureRateLimiter();
    this.configureGoogleStrategy();
  }

  /**
   * Configures rate limiting for OAuth endpoints
   */
  private configureRateLimiter(): void {
    this.rateLimiter = new RateLimiterRedis({
      storeClient: oauthConfig.redis.client,
      keyPrefix: 'oauth_limiter',
      points: this.MAX_FAILED_ATTEMPTS,
      duration: this.BLOCK_DURATION,
    });
  }

  /**
   * Generates PKCE challenge and verifier
   */
  private generatePKCEPair(): PKCEChallenge {
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  /**
   * Configures Google OAuth 2.0 strategy with enhanced security
   */
  private configureGoogleStrategy(): void {
    const { google } = oauthConfig;

    passport.use(new GoogleStrategy({
      clientID: google.clientID,
      clientSecret: google.clientSecret,
      callbackURL: google.callbackURL,
      passReqToCallback: true,
      scope: ['profile', 'email'],
      state: true,
      proxy: process.env.NODE_ENV === 'production'
    }, this.verifyGoogleCallback.bind(this)));

    // Session serialization for enhanced security
    passport.serializeUser((user: IUser, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await this.userModel.findById(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  /**
   * Enhanced Google OAuth verification with comprehensive security checks
   */
  private async verifyGoogleCallback(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void
  ): Promise<void> {
    try {
      // Rate limiting check
      await this.rateLimiter.consume(req.ip);

      // Validate PKCE
      const storedVerifier = req.session.codeVerifier;
      const receivedChallenge = req.query.code_challenge as string;

      if (!this.validatePKCE(storedVerifier, receivedChallenge)) {
        throw new Error('Invalid PKCE verification');
      }

      // Validate state parameter
      if (req.query.state !== req.session.oauthState) {
        throw new Error('Invalid state parameter');
      }

      // Domain validation
      const email = profile.emails[0].value;
      const domain = email.split('@')[1];
      
      if (!this.ALLOWED_DOMAINS.includes(domain)) {
        throw new Error('Domain not allowed');
      }

      // Find or create user
      let user = await this.userModel.findByEmail(email);

      if (user) {
        // Validate user status
        if (user.status !== UserStatus.ACTIVE) {
          throw new Error('Account is not active');
        }

        // Update user profile
        user = await this.userModel.update(user.id, {
          lastLoginAt: new Date(),
          profile: {
            name: profile.displayName,
            picture: profile.photos[0]?.value
          }
        });
      } else {
        // Create new user
        user = await this.userModel.create({
          email,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE,
          profile: {
            name: profile.displayName,
            picture: profile.photos[0]?.value
          }
        });
      }

      // Clear session PKCE data
      delete req.session.codeVerifier;
      delete req.session.oauthState;

      done(null, user);
    } catch (error) {
      done(error);
    }
  }

  /**
   * Validates PKCE challenge and verifier
   */
  private validatePKCE(verifier: string, challenge: string): boolean {
    if (!verifier || !challenge) {
      return false;
    }

    const computedChallenge = createHash('sha256')
      .update(verifier)
      .digest('base64url');

    return computedChallenge === challenge;
  }

  /**
   * Initiates OAuth authentication with PKCE
   */
  public async initiateAuth(req: Request, res: Response): Promise<void> {
    try {
      // Generate PKCE pair
      const { codeVerifier, codeChallenge } = this.generatePKCEPair();
      
      // Store PKCE verifier in session
      req.session.codeVerifier = codeVerifier;
      
      // Generate and store state parameter
      req.session.oauthState = randomBytes(32).toString('hex');

      // Initiate OAuth flow with PKCE
      passport.authenticate('google', {
        state: req.session.oauthState,
        codeChallengeMethod: 'S256',
        codeChallenge
      })(req, res);
    } catch (error) {
      res.status(500).json({ error: 'Authentication initialization failed' });
    }
  }

  /**
   * Handles OAuth callback with comprehensive security validation
   */
  public async handleAuthCallback(req: Request, res: Response): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        passport.authenticate('google', { session: false }, (error, user) => {
          if (error) reject(error);
          if (!user) reject(new Error('Authentication failed'));
          req.logIn(user, (err) => {
            if (err) reject(err);
            resolve();
          });
        })(req, res);
      });

      // Generate secure session token
      const sessionToken = randomBytes(32).toString('hex');

      // Set secure cookie
      res.cookie('session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.redirect('/dashboard');
    } catch (error) {
      res.redirect('/auth/error');
    }
  }
}