/**
 * Comprehensive unit tests for JWT service functionality
 * Tests enhanced security features, token lifecycle, and error handling
 * @see Technical Specifications/7.1.1 Authentication Methods
 * @version jest@29.0.0
 * @version jsonwebtoken@9.0.0
 */

import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { JWTService } from '../../src/services/jwt.service';
import { jwtConfig } from '../../src/config/jwt.config';
import { IUserAuth, UserRole } from '../../../shared/interfaces/user.interface';

describe('JWTService', () => {
  let jwtService: JWTService;
  const mockUser: IUserAuth = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: UserRole.FAMILY_ADMIN,
    twoFactorEnabled: false,
    sessionId: 'test-session-id'
  };

  beforeEach(() => {
    jwtService = new JWTService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Generation', () => {
    test('should generate valid JWT token with correct claims', async () => {
      const token = await jwtService.generateToken(mockUser);
      const decoded = jwt.decode(token, { complete: true });

      expect(decoded).toBeTruthy();
      expect(decoded.header.alg).toBe(jwtConfig.algorithm);
      expect(decoded.payload.userId).toBe(mockUser.userId);
      expect(decoded.payload.email).toBe(mockUser.email);
      expect(decoded.payload.role).toBe(mockUser.role);
      expect(decoded.payload.iss).toBe(jwtConfig.issuer);
      expect(decoded.payload.aud).toBe(jwtConfig.audience);
    });

    test('should include security-critical claims', async () => {
      const token = await jwtService.generateToken(mockUser);
      const decoded = jwt.decode(token, { complete: true });

      expect(decoded.payload.jti).toBeTruthy(); // Unique token ID
      expect(decoded.payload.sub).toBe(mockUser.userId); // Subject claim
      expect(decoded.payload.iat).toBeTruthy(); // Issued at
      expect(decoded.payload.exp).toBeTruthy(); // Expiration
      expect(decoded.payload.nbf).toBeLessThanOrEqual(Math.floor(Date.now() / 1000)); // Not before
    });

    test('should throw error for invalid user data', async () => {
      const invalidUser = { ...mockUser, userId: undefined };
      await expect(jwtService.generateToken(invalidUser as IUserAuth))
        .rejects
        .toThrow('Token generation failed');
    });
  });

  describe('Token Verification', () => {
    test('should verify valid token and return user data', async () => {
      const token = await jwtService.generateToken(mockUser);
      const verified = await jwtService.verifyToken(token);

      expect(verified.userId).toBe(mockUser.userId);
      expect(verified.email).toBe(mockUser.email);
      expect(verified.role).toBe(mockUser.role);
      expect(verified.twoFactorEnabled).toBe(mockUser.twoFactorEnabled);
      expect(verified.sessionId).toBe(mockUser.sessionId);
    });

    test('should reject token with invalid issuer', async () => {
      const token = jwt.sign(mockUser, jwtConfig.secret, {
        issuer: 'invalid-issuer',
        algorithm: jwtConfig.algorithm as jwt.Algorithm
      });

      await expect(jwtService.verifyToken(token))
        .rejects
        .toThrow('Invalid token');
    });

    test('should reject token with invalid audience', async () => {
      const token = jwt.sign(mockUser, jwtConfig.secret, {
        audience: 'invalid-audience',
        algorithm: jwtConfig.algorithm as jwt.Algorithm
      });

      await expect(jwtService.verifyToken(token))
        .rejects
        .toThrow('Invalid token');
    });

    test('should reject expired token', async () => {
      const token = jwt.sign(mockUser, jwtConfig.secret, {
        expiresIn: '0s',
        algorithm: jwtConfig.algorithm as jwt.Algorithm
      });

      await expect(jwtService.verifyToken(token))
        .rejects
        .toThrow('Token has expired');
    });

    test('should reject token with invalid signature', async () => {
      const token = await jwtService.generateToken(mockUser);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      await expect(jwtService.verifyToken(tamperedToken))
        .rejects
        .toThrow('Invalid token');
    });
  });

  describe('Token Refresh', () => {
    test('should refresh valid token with new expiry', async () => {
      const originalToken = await jwtService.generateToken(mockUser);
      const refreshedToken = await jwtService.refreshToken(originalToken);

      expect(refreshedToken).not.toBe(originalToken);

      const originalDecoded = jwt.decode(originalToken, { complete: true });
      const refreshedDecoded = jwt.decode(refreshedToken, { complete: true });

      expect(refreshedDecoded.payload.exp).toBeGreaterThan(originalDecoded.payload.exp);
      expect(refreshedDecoded.payload.userId).toBe(originalDecoded.payload.userId);
      expect(refreshedDecoded.payload.email).toBe(originalDecoded.payload.email);
      expect(refreshedDecoded.payload.role).toBe(originalDecoded.payload.role);
    });

    test('should reject refresh of expired token', async () => {
      const expiredToken = jwt.sign(mockUser, jwtConfig.secret, {
        expiresIn: '0s',
        algorithm: jwtConfig.algorithm as jwt.Algorithm
      });

      await expect(jwtService.refreshToken(expiredToken))
        .rejects
        .toThrow('Token refresh failed: Token has expired');
    });

    test('should reject refresh of invalid token', async () => {
      await expect(jwtService.refreshToken('invalid-token'))
        .rejects
        .toThrow('Token refresh failed: Invalid token');
    });
  });

  describe('Error Handling', () => {
    test('should handle null token input', async () => {
      await expect(jwtService.verifyToken(null))
        .rejects
        .toThrow('Token verification failed');
    });

    test('should handle undefined token input', async () => {
      await expect(jwtService.verifyToken(undefined))
        .rejects
        .toThrow('Token verification failed');
    });

    test('should handle malformed token', async () => {
      await expect(jwtService.verifyToken('malformed.token.structure'))
        .rejects
        .toThrow('Invalid token');
    });

    test('should handle token with missing required claims', async () => {
      const tokenWithoutClaims = jwt.sign({}, jwtConfig.secret, {
        algorithm: jwtConfig.algorithm as jwt.Algorithm
      });

      await expect(jwtService.verifyToken(tokenWithoutClaims))
        .rejects
        .toThrow('Token ID (jti) is missing');
    });

    test('should handle token with invalid algorithm', async () => {
      const tokenWithInvalidAlg = jwt.sign(mockUser, jwtConfig.secret, {
        algorithm: 'none' as jwt.Algorithm
      });

      await expect(jwtService.verifyToken(tokenWithInvalidAlg))
        .rejects
        .toThrow('Invalid token');
    });
  });
});