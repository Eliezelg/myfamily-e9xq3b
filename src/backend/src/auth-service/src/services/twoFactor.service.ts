import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy'; // v2.0.0
import * as AWS from 'aws-sdk'; // v2.1.0
import { Redis } from 'redis'; // v4.6.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // v2.4.1
import { UserModel } from '../models/user.model';
import { IUser } from '../../shared/interfaces/user.interface';
import * as crypto from 'crypto';

/**
 * Enhanced service for managing two-factor authentication with advanced security features
 */
@Injectable()
export class TwoFactorService {
  private readonly redisClient: Redis;
  private readonly sesClient: AWS.SES;
  private readonly rateLimiter: RateLimiterRedis;
  private readonly CODE_EXPIRY = 300; // 5 minutes in seconds
  private readonly MAX_ATTEMPTS = 3;
  private readonly BLOCK_DURATION = 900; // 15 minutes in seconds

  constructor(private readonly userModel: UserModel) {
    // Initialize Redis client with TLS
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
      tls: {},
    });

    // Initialize AWS SES with retry configuration
    this.sesClient = new AWS.SES({
      region: process.env.AWS_REGION,
      maxRetries: 3,
      retryDelayOptions: { base: 200 },
    });

    // Configure rate limiter with progressive thresholds
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redisClient,
      keyPrefix: '2fa_limit',
      points: this.MAX_ATTEMPTS,
      duration: this.BLOCK_DURATION,
      blockDuration: this.BLOCK_DURATION,
    });

    // Setup cleanup job for expired codes
    this.setupCleanupJob();
  }

  /**
   * Generates a secure verification code with rate limiting
   */
  async generateCode(userId: string, method: string): Promise<string> {
    try {
      // Check rate limit
      await this.rateLimiter.consume(userId);

      // Generate secure TOTP code
      const code = speakeasy.generateSecret({
        length: 6,
        encoding: 'base32',
      }).base32;

      // Encrypt code for storage
      const encryptedCode = this.encryptCode(code);

      // Store in Redis with expiry
      const key = `2fa_code:${userId}`;
      await this.redisClient.setEx(key, this.CODE_EXPIRY, encryptedCode);

      // Send code via specified method
      await this.sendCode(userId, code, method);

      return code;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`2FA code generation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Verifies 2FA code with enhanced security checks
   */
  async verifyCode(userId: string, code: string): Promise<boolean> {
    try {
      // Check verification attempts rate limit
      await this.rateLimiter.consume(userId);

      // Retrieve stored code
      const key = `2fa_code:${userId}`;
      const encryptedStoredCode = await this.redisClient.get(key);

      if (!encryptedStoredCode) {
        throw new Error('Code expired or invalid');
      }

      // Decrypt stored code
      const storedCode = this.decryptCode(encryptedStoredCode);

      // Timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(code),
        Buffer.from(storedCode)
      );

      if (isValid) {
        // Clean up used code
        await this.redisClient.del(key);
        return true;
      }

      // Check backup codes if regular code fails
      return this.verifyBackupCode(userId, code);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Code verification failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generates secure backup codes for account recovery
   */
  async generateBackupCodes(userId: string): Promise<string[]> {
    try {
      const backupCodes: string[] = [];
      const hashedCodes: string[] = [];

      // Generate cryptographically secure backup codes
      for (let i = 0; i < 10; i++) {
        const code = crypto.randomBytes(4).toString('hex');
        backupCodes.push(code);
        hashedCodes.push(await this.hashCode(code));
      }

      // Store hashed backup codes
      await this.userModel.updateBackupCodes(userId, hashedCodes);

      return backupCodes;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Backup code generation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async sendCode(userId: string, code: string, method: string): Promise<void> {
    const user = await this.userModel.findByEmail(userId);
    
    if (method === 'EMAIL') {
      await this.sendEmailCode(user.email, code);
    } else if (method === 'SMS') {
      // SMS implementation would go here
      throw new Error('SMS delivery not implemented');
    }
  }

  private async sendEmailCode(email: string, code: string): Promise<void> {
    const params = {
      Source: process.env.SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: 'MyFamily Security Code',
        },
        Body: {
          Text: {
            Data: `Your security code is: ${code}. Valid for 5 minutes.`,
          },
        },
      },
    };

    await this.sesClient.sendEmail(params).promise();
  }

  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.userModel.findByEmail(userId);
    const hashedCode = await this.hashCode(code);
    
    // Verify against stored backup codes
    const isValidBackupCode = user.backupCodes.includes(hashedCode);
    
    if (isValidBackupCode) {
      // Remove used backup code
      const updatedBackupCodes = user.backupCodes.filter(c => c !== hashedCode);
      await this.userModel.updateBackupCodes(userId, updatedBackupCodes);
      return true;
    }
    
    return false;
  }

  private encryptCode(code: string): string {
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
      crypto.randomBytes(12)
    );
    const encrypted = cipher.update(code, 'utf8', 'hex');
    return encrypted + cipher.final('hex');
  }

  private decryptCode(encryptedCode: string): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
      crypto.randomBytes(12)
    );
    const decrypted = decipher.update(encryptedCode, 'hex', 'utf8');
    return decrypted + decipher.final('utf8');
  }

  private async hashCode(code: string): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(code, process.env.HASH_SALT, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(derivedKey.toString('hex'));
      });
    });
  }

  private setupCleanupJob(): void {
    setInterval(async () => {
      const pattern = '2fa_code:*';
      const keys = await this.redisClient.keys(pattern);
      
      for (const key of keys) {
        const ttl = await this.redisClient.ttl(key);
        if (ttl <= 0) {
          await this.redisClient.del(key);
        }
      }
    }, 60000); // Run every minute
  }
}