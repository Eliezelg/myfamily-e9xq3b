/**
 * @fileoverview Integration tests for API Gateway service
 * Tests authentication flows, authorization rules, security controls,
 * error handling, and cross-service communication
 * Version: 1.0.0
 */

import request from 'supertest'; // ^6.3.3
import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals'; // ^29.5.0
import jwt from 'jsonwebtoken'; // ^9.0.0
import nock from 'nock'; // ^13.3.0

import { app } from '../../src/app';
import { ApiError } from '../../src/middleware/error.middleware';
import { UserRole } from '../../../shared/interfaces/user.interface';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { HttpStatusCodes } from '../../../shared/constants/status-codes';

// Test environment configuration
const TEST_JWT_SECRET = process.env.TEST_JWT_SECRET || 'test-secret';
const TEST_RATE_LIMIT = process.env.TEST_RATE_LIMIT || 100;

/**
 * Generates test JWT tokens for different scenarios
 */
const generateTestToken = (payload: any, tokenType: 'valid' | 'expired' | 'invalid' = 'valid'): string => {
  const basePayload = {
    userId: '123',
    email: 'test@example.com',
    sessionId: 'test-session',
    ...payload
  };

  switch (tokenType) {
    case 'expired':
      return jwt.sign(basePayload, TEST_JWT_SECRET, { expiresIn: '-1h' });
    case 'invalid':
      return 'invalid.token.format';
    default:
      return jwt.sign(basePayload, TEST_JWT_SECRET, { expiresIn: '1h' });
  }
};

/**
 * Sets up test environment with mocks and fixtures
 */
const setupTestEnvironment = () => {
  // Mock external service endpoints
  nock('http://auth-service')
    .persist()
    .post('/verify')
    .reply(200, { valid: true });

  nock('http://content-service')
    .persist()
    .get('/health')
    .reply(200, { status: 'healthy' });
};

describe('API Gateway Integration Tests', () => {
  beforeAll(() => {
    setupTestEnvironment();
  });

  afterAll(() => {
    nock.cleanAll();
  });

  describe('Authentication Tests', () => {
    test('should validate JWT token structure and claims', async () => {
      const token = generateTestToken({ role: UserRole.MEMBER });
      const response = await request(app)
        .get('/api/v1/families')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(HttpStatusCodes.OK);
      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    test('should reject expired tokens', async () => {
      const token = generateTestToken({ role: UserRole.MEMBER }, 'expired');
      const response = await request(app)
        .get('/api/v1/families')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
      expect(response.body.errorCode).toBe(ErrorCodes.AUTHENTICATION_ERROR);
    });

    test('should handle missing authentication', async () => {
      const response = await request(app).get('/api/v1/families');

      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
      expect(response.body.errorCode).toBe(ErrorCodes.AUTHENTICATION_ERROR);
    });

    test('should validate 2FA requirements for sensitive operations', async () => {
      const token = generateTestToken({ 
        role: UserRole.FAMILY_ADMIN,
        twoFactorEnabled: true,
        twoFactorVerified: false
      });

      const response = await request(app)
        .post('/api/v1/families')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Family' });

      expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);
      expect(response.body.errorCode).toBe(ErrorCodes.AUTHORIZATION_ERROR);
    });
  });

  describe('Authorization Tests', () => {
    test('should enforce role-based access control', async () => {
      const memberToken = generateTestToken({ role: UserRole.MEMBER });
      const adminToken = generateTestToken({ role: UserRole.FAMILY_ADMIN });

      // Member attempting admin operation
      const memberResponse = await request(app)
        .post('/api/v1/families')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Test Family' });

      expect(memberResponse.status).toBe(HttpStatusCodes.FORBIDDEN);

      // Admin performing allowed operation
      const adminResponse = await request(app)
        .post('/api/v1/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Family' });

      expect(adminResponse.status).toBe(HttpStatusCodes.CREATED);
    });

    test('should validate resource permissions', async () => {
      const token = generateTestToken({ 
        role: UserRole.CONTENT_CONTRIBUTOR,
        familyId: 'family-123'
      });

      // Accessing allowed family
      const allowedResponse = await request(app)
        .get('/api/v1/content/family-123')
        .set('Authorization', `Bearer ${token}`);

      expect(allowedResponse.status).toBe(HttpStatusCodes.OK);

      // Accessing unauthorized family
      const forbiddenResponse = await request(app)
        .get('/api/v1/content/family-456')
        .set('Authorization', `Bearer ${token}`);

      expect(forbiddenResponse.status).toBe(HttpStatusCodes.FORBIDDEN);
    });
  });

  describe('Security Tests', () => {
    test('should enforce rate limiting', async () => {
      const token = generateTestToken({ role: UserRole.MEMBER });
      const requests = Array(TEST_RATE_LIMIT + 1).fill(null);

      for (const _ of requests) {
        await request(app)
          .get('/api/v1/families')
          .set('Authorization', `Bearer ${token}`);
      }

      const response = await request(app)
        .get('/api/v1/families')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(HttpStatusCodes.TOO_MANY_REQUESTS);
    });

    test('should validate security headers', async () => {
      const token = generateTestToken({ role: UserRole.MEMBER });
      const response = await request(app)
        .get('/api/v1/families')
        .set('Authorization', `Bearer ${token}`);

      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    test('should handle CORS configuration', async () => {
      const token = generateTestToken({ role: UserRole.MEMBER });
      const response = await request(app)
        .options('/api/v1/families')
        .set('Origin', process.env.WEB_URL || 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Authorization', `Bearer ${token}`);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle validation errors', async () => {
      const token = generateTestToken({ role: UserRole.FAMILY_ADMIN });
      const response = await request(app)
        .post('/api/v1/families')
        .set('Authorization', `Bearer ${token}`)
        .send({ invalid: 'data' });

      expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST);
      expect(response.body.errorCode).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    test('should handle service unavailability', async () => {
      nock('http://content-service')
        .get('/content')
        .replyWithError('Service unavailable');

      const token = generateTestToken({ role: UserRole.MEMBER });
      const response = await request(app)
        .get('/api/v1/content')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(HttpStatusCodes.SERVICE_UNAVAILABLE);
    });

    test('should include correlation IDs in error responses', async () => {
      const token = generateTestToken({ role: UserRole.MEMBER }, 'invalid');
      const response = await request(app)
        .get('/api/v1/families')
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.correlationId).toBeDefined();
      expect(response.headers['x-correlation-id']).toBeDefined();
    });
  });
});