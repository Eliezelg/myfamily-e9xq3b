/**
 * JWT Service Implementation for MyFamily Authentication
 * Provides secure token generation, validation, and management
 * with enhanced security features including issuer/audience validation
 * @see Technical Specifications/7.1.1 Authentication Methods
 * @version jsonwebtoken@9.0.0
 */

import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.config';
import { IUserAuth } from '../../../shared/interfaces/user.interface';

/**
 * Service responsible for JWT token operations with comprehensive security features
 * Implements production-grade token management with enhanced validation
 */
export class JWTService {
  private readonly secret: string;
  private readonly expiresIn: string;
  private readonly algorithm: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor() {
    this.secret = jwtConfig.secret;
    this.expiresIn = jwtConfig.expiresIn;
    this.algorithm = jwtConfig.algorithm;
    this.issuer = jwtConfig.issuer;
    this.audience = jwtConfig.audience;
  }

  /**
   * Generates a secure JWT token for authenticated user with enhanced security claims
   * @param user - User authentication data
   * @returns Promise resolving to signed JWT token
   * @throws Error if token generation fails
   */
  public async generateToken(user: IUserAuth): Promise<string> {
    try {
      const payload = {
        userId: user.userId,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        sessionId: user.sessionId
      };

      const tokenOptions: jwt.SignOptions = {
        expiresIn: this.expiresIn,
        algorithm: this.algorithm as jwt.Algorithm,
        issuer: this.issuer,
        audience: this.audience,
        jwtid: crypto.randomUUID(), // Unique token ID for tracking
        notBefore: '0', // Token valid immediately
        subject: user.userId // Subject claim for user identification
      };

      const token = jwt.sign(payload, this.secret, tokenOptions);
      return token;
    } catch (error) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Verifies and decodes a JWT token with comprehensive validation
   * @param token - JWT token to verify
   * @returns Promise resolving to decoded user data
   * @throws Error if token is invalid or verification fails
   */
  public async verifyToken(token: string): Promise<IUserAuth> {
    try {
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: [this.algorithm as jwt.Algorithm],
        issuer: this.issuer,
        audience: this.audience,
        complete: true // Return decoded header and payload
      };

      const decoded = jwt.verify(token, this.secret, verifyOptions) as jwt.JwtPayload;

      // Additional security validations
      if (!decoded.jti) {
        throw new Error('Token ID (jti) is missing');
      }

      if (!decoded.sub) {
        throw new Error('Subject claim is missing');
      }

      // Extract and validate user data
      const userData: IUserAuth = {
        userId: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        twoFactorEnabled: decoded.twoFactorEnabled,
        sessionId: decoded.sessionId
      };

      return userData;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Generates a new token with fresh expiry after comprehensive validation
   * @param token - Current valid JWT token
   * @returns Promise resolving to new JWT token
   * @throws Error if refresh operation fails
   */
  public async refreshToken(token: string): Promise<string> {
    try {
      // Verify current token first
      const userData = await this.verifyToken(token);

      // Generate new token with fresh expiry
      const newToken = await this.generateToken(userData);
      return newToken;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }
}