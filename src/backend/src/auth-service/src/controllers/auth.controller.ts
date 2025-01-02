import { Controller, Post, UseGuards, Request, Response } from '@nestjs/common';
import { z } from 'zod'; // v3.21.4
import { RateLimitGuard } from '../guards/rateLimit.guard';
import { JWTService } from '../services/jwt.service';
import { OAuthService } from '../services/oauth.service';
import { TwoFactorService } from '../services/twoFactor.service';
import { UserRole, UserStatus } from '../../../shared/interfaces/user.interface';
import { AuditLogger } from '../utils/auditLogger';

/**
 * Enhanced validation schemas with strict requirements
 */
const RegisterSchema = z.object({
  email: z.string().email().min(5).max(255),
  password: z.string()
    .min(12)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  language: z.string().length(2).optional().default('en')
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  twoFactorCode: z.string().optional()
});

/**
 * Enhanced authentication controller with comprehensive security features
 * Implements JWT-based auth, OAuth, 2FA, and strict RBAC
 */
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  private readonly auditLogger: AuditLogger;

  constructor(
    private readonly jwtService: JWTService,
    private readonly oauthService: OAuthService,
    private readonly twoFactorService: TwoFactorService
  ) {
    this.auditLogger = new AuditLogger();
  }

  /**
   * Enhanced user registration with comprehensive validation
   */
  @Post('register')
  async register(@Request() req, @Response() res) {
    try {
      // Validate request payload
      const validatedData = RegisterSchema.parse(req.body);

      // Check for existing user
      const existingUser = await this.userModel.findByEmail(validatedData.email);
      if (existingUser) {
        this.auditLogger.log('registration-failed', {
          reason: 'email-exists',
          email: validatedData.email,
          ip: req.ip
        });
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Create user with default member role
      const user = await this.userModel.create({
        ...validatedData,
        role: UserRole.MEMBER,
        status: UserStatus.PENDING_VERIFICATION
      });

      // Generate verification token
      const verificationToken = await this.jwtService.generateToken({
        userId: user.id,
        email: user.email,
        type: 'verification'
      });

      // Send verification email
      await this.emailService.sendVerificationEmail(user.email, verificationToken);

      this.auditLogger.log('registration-success', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      return res.status(201).json({
        message: 'Registration successful. Please verify your email.'
      });
    } catch (error) {
      this.auditLogger.log('registration-error', {
        error: error.message,
        ip: req.ip
      });
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Enhanced login with progressive rate limiting and 2FA support
   */
  @Post('login')
  async login(@Request() req, @Response() res) {
    try {
      // Validate request payload
      const validatedData = LoginSchema.parse(req.body);

      // Check rate limiting
      await this.checkRateLimit(req.ip);

      // Authenticate user
      const user = await this.userModel.findByEmail(validatedData.email);
      if (!user || !await this.userModel.verifyPassword(validatedData.password)) {
        this.auditLogger.log('login-failed', {
          email: validatedData.email,
          reason: 'invalid-credentials',
          ip: req.ip
        });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check account status
      if (user.status !== UserStatus.ACTIVE) {
        this.auditLogger.log('login-failed', {
          userId: user.id,
          reason: 'inactive-account',
          ip: req.ip
        });
        return res.status(403).json({ error: 'Account is not active' });
      }

      // Handle 2FA if enabled
      if (user.twoFactorEnabled) {
        if (!validatedData.twoFactorCode) {
          // Generate and send 2FA code
          await this.twoFactorService.generateCode(user.id, user.twoFactorMethod);
          return res.status(200).json({ requiresTwoFactor: true });
        }

        // Verify 2FA code
        const isValidCode = await this.twoFactorService.verifyCode(
          user.id,
          validatedData.twoFactorCode
        );

        if (!isValidCode) {
          this.auditLogger.log('2fa-failed', {
            userId: user.id,
            ip: req.ip
          });
          return res.status(401).json({ error: 'Invalid 2FA code' });
        }
      }

      // Generate JWT token
      const token = await this.jwtService.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        sessionId: crypto.randomUUID()
      });

      // Update last login timestamp
      await this.userModel.updateLastLogin(user.id);

      this.auditLogger.log('login-success', {
        userId: user.id,
        ip: req.ip
      });

      return res.status(200).json({ token });
    } catch (error) {
      this.auditLogger.log('login-error', {
        error: error.message,
        ip: req.ip
      });
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Handles OAuth authentication callback with PKCE validation
   */
  @Post('oauth/callback')
  async handleOAuthCallback(@Request() req, @Response() res) {
    try {
      const result = await this.oauthService.handleAuthCallback(req, res);
      return res.status(200).json(result);
    } catch (error) {
      this.auditLogger.log('oauth-error', {
        error: error.message,
        ip: req.ip
      });
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Refreshes JWT token with comprehensive validation
   */
  @Post('refresh')
  async refreshToken(@Request() req, @Response() res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      // Check token blacklist
      const isBlacklisted = await this.jwtService.checkBlacklist(token);
      if (isBlacklisted) {
        this.auditLogger.log('token-refresh-failed', {
          reason: 'blacklisted',
          ip: req.ip
        });
        return res.status(401).json({ error: 'Token is invalid' });
      }

      const newToken = await this.jwtService.refreshToken(token);

      this.auditLogger.log('token-refresh-success', {
        ip: req.ip
      });

      return res.status(200).json({ token: newToken });
    } catch (error) {
      this.auditLogger.log('token-refresh-error', {
        error: error.message,
        ip: req.ip
      });
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Verifies 2FA code with rate limiting
   */
  @Post('verify-2fa')
  async verify2FA(@Request() req, @Response() res) {
    try {
      const { userId, code } = req.body;

      const isValid = await this.twoFactorService.verifyCode(userId, code);
      if (!isValid) {
        this.auditLogger.log('2fa-verification-failed', {
          userId,
          ip: req.ip
        });
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }

      this.auditLogger.log('2fa-verification-success', {
        userId,
        ip: req.ip
      });

      return res.status(200).json({ verified: true });
    } catch (error) {
      this.auditLogger.log('2fa-verification-error', {
        error: error.message,
        ip: req.ip
      });
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Private helper methods
   */

  private async checkRateLimit(ip: string): Promise<void> {
    const attempts = await this.redisClient.incr(`login_attempts:${ip}`);
    if (attempts === 1) {
      await this.redisClient.expire(`login_attempts:${ip}`, 900); // 15 minutes
    }
    if (attempts > 5) {
      throw new Error('Too many login attempts. Please try again later.');
    }
  }
}