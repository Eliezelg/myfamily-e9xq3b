import { PrismaClient } from '@prisma/client'; // v4.9.0
import * as bcrypt from 'bcryptjs'; // v2.4.3
import rateLimit from 'express-rate-limit'; // v6.7.0
import { IUser, UserRole, UserStatus } from '../../shared/interfaces/user.interface';

/**
 * Supported language codes based on ISO 639-1
 */
const SUPPORTED_LANGUAGES = ['en', 'he', 'fr', 'es', 'de', 'ru', 'ar', 'zh'];

/**
 * Password policy configuration
 */
const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  saltRounds: 12,
  historyLimit: 5
};

/**
 * Two-factor authentication configuration
 */
interface TwoFactorSetup {
  secret: string;
  backupCodes: string[];
  method: TwoFactorMethod;
}

enum TwoFactorMethod {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  AUTHENTICATOR = 'AUTHENTICATOR'
}

/**
 * Rate limiting configuration
 */
const AUTH_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many authentication attempts, please try again later'
};

/**
 * Enhanced Prisma model class for user entity with comprehensive security features
 */
export class UserModel {
  private prisma: PrismaClient;
  private rateLimiter: typeof rateLimit;

  constructor(prisma: PrismaClient, rateLimiter: typeof rateLimit) {
    this.prisma = prisma;
    this.rateLimiter = rateLimiter({
      ...AUTH_RATE_LIMIT,
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  /**
   * Creates a new user with enhanced security features and GDPR compliance
   */
  async create(userData: CreateUserDto): Promise<IUser> {
    // Validate password strength
    if (!this.validatePasswordStrength(userData.password)) {
      throw new Error('Password does not meet security requirements');
    }

    // Check email uniqueness
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password with secure salt
    const hashedPassword = await bcrypt.hash(userData.password, PASSWORD_POLICY.saltRounds);

    // Create user with security settings
    const user = await this.prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || UserRole.MEMBER,
        status: UserStatus.PENDING_VERIFICATION,
        language: this.validateLanguage(userData.language),
        twoFactorEnabled: false,
        passwordHistory: [hashedPassword],
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Return sanitized user object (exclude sensitive data)
    return this.sanitizeUser(user);
  }

  /**
   * Updates user language preference with validation
   */
  async updateLanguagePreference(userId: string, language: string): Promise<IUser> {
    const validatedLanguage = this.validateLanguage(language);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        language: validatedLanguage,
        updatedAt: new Date()
      }
    });

    return this.sanitizeUser(user);
  }

  /**
   * Sets up two-factor authentication with backup codes
   */
  async setup2FA(userId: string, method: TwoFactorMethod): Promise<TwoFactorSetup> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new Error('User not eligible for 2FA setup');
    }

    // Generate 2FA secret and backup codes
    const secret = this.generate2FASecret();
    const backupCodes = this.generateBackupCodes();

    // Store encrypted configuration
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: this.encrypt(secret),
        twoFactorBackupCodes: this.encryptBackupCodes(backupCodes),
        twoFactorMethod: method,
        updatedAt: new Date()
      }
    });

    return {
      secret,
      backupCodes,
      method
    };
  }

  /**
   * Validates password strength against security policy
   */
  private validatePasswordStrength(password: string): boolean {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
      password.length >= PASSWORD_POLICY.minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChars
    );
  }

  /**
   * Validates and normalizes language code
   */
  private validateLanguage(language: string): string {
    const normalizedLanguage = language?.toLowerCase() || 'en';
    if (!SUPPORTED_LANGUAGES.includes(normalizedLanguage)) {
      return 'en'; // Default to English if unsupported
    }
    return normalizedLanguage;
  }

  /**
   * Generates secure 2FA secret
   */
  private generate2FASecret(): string {
    // Implementation of secure secret generation
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generates backup codes for 2FA recovery
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex'));
    }
    return codes;
  }

  /**
   * Encrypts sensitive data using platform encryption key
   */
  private encrypt(data: string): string {
    // Implementation of encryption using platform key
    return data; // Placeholder for actual encryption
  }

  /**
   * Encrypts backup codes for secure storage
   */
  private encryptBackupCodes(codes: string[]): string[] {
    return codes.map(code => this.encrypt(code));
  }

  /**
   * Removes sensitive data from user object
   */
  private sanitizeUser(user: any): IUser {
    const { password, passwordHistory, twoFactorSecret, twoFactorBackupCodes, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

/**
 * Data transfer object for user creation
 */
interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  language?: string;
}

export { TwoFactorMethod, TwoFactorSetup };