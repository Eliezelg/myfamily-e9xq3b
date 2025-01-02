import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'; // ^29.5.0
import request from 'supertest'; // ^6.3.3
import { App } from '../../src/app';
import { UserModel } from '../../src/models/user.model';
import { UserRole, UserStatus } from '../../../../shared/interfaces/user.interface';
import { MockOAuthProvider } from '@test/mocks'; // ^1.0.0

// Test user constants
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test123!@#',
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.MEMBER
};

const TEST_ADMIN = {
  email: 'admin@example.com',
  password: 'Admin123!@#',
  firstName: 'Admin',
  lastName: 'User',
  role: UserRole.SYSTEM_ADMIN
};

// Rate limit window in milliseconds
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;

describe('Auth Service Integration Tests', () => {
  let app: App;
  let userModel: UserModel;
  let mockOAuth: MockOAuthProvider;

  beforeAll(async () => {
    // Initialize app and dependencies
    app = new App();
    await app.start();

    // Clear test database
    await UserModel.deleteMany({});

    // Create test users
    userModel = new UserModel(app.getPrismaClient(), app.getRateLimiter());
    await userModel.create(TEST_USER);
    await userModel.create(TEST_ADMIN);

    // Initialize mock OAuth provider
    mockOAuth = new MockOAuthProvider();
  });

  afterAll(async () => {
    // Cleanup
    await UserModel.deleteMany({});
    await app.stop();
  });

  describe('Registration Tests', () => {
    it('should successfully register a new user', async () => {
      const newUser = {
        email: 'new@example.com',
        password: 'NewUser123!@#',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Registration successful. Please verify your email.');
      expect(response.headers).toHaveProperty('x-request-id');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should reject registration with existing email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(TEST_USER)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Email already registered');
    });

    it('should reject weak passwords', async () => {
      const weakUser = {
        ...TEST_USER,
        email: 'weak@example.com',
        password: 'weak'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(weakUser)
        .expect(400);

      expect(response.body.error).toMatch(/password/i);
    });
  });

  describe('Login Tests', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: TEST_USER.email,
          password: TEST_USER.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.headers['x-rate-limit-remaining']).toBeDefined();
    });

    it('should handle progressive rate limiting', async () => {
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: TEST_USER.email,
            password: 'wrong'
          });

        if (i < 5) {
          expect(response.status).toBe(401);
        } else {
          expect(response.status).toBe(429);
          expect(response.body).toHaveProperty('error', 'Too many login attempts, please try again later');
        }
      }
    });

    it('should require 2FA when enabled', async () => {
      // Enable 2FA for test user
      await userModel.setup2FA(TEST_USER.email, 'EMAIL');

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: TEST_USER.email,
          password: TEST_USER.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('requiresTwoFactor', true);
    });
  });

  describe('Two-Factor Authentication Tests', () => {
    it('should verify valid 2FA code', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: TEST_USER.email,
          password: TEST_USER.password
        });

      const code = await userModel.get2FACode(TEST_USER.email);

      const response = await request(app)
        .post('/auth/verify-2fa')
        .send({
          userId: TEST_USER.email,
          code
        })
        .expect(200);

      expect(response.body).toHaveProperty('verified', true);
    });

    it('should reject invalid 2FA code', async () => {
      const response = await request(app)
        .post('/auth/verify-2fa')
        .send({
          userId: TEST_USER.email,
          code: '000000'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid 2FA code');
    });
  });

  describe('OAuth Tests', () => {
    it('should initiate OAuth flow with PKCE', async () => {
      const response = await request(app)
        .get('/auth/google')
        .expect(302);

      expect(response.headers.location).toMatch(/^https:\/\/accounts\.google\.com/);
      expect(response.headers.location).toContain('code_challenge');
    });

    it('should handle OAuth callback successfully', async () => {
      const mockCode = 'mock_auth_code';
      mockOAuth.setAuthorizationCode(mockCode);

      const response = await request(app)
        .get('/auth/google/callback')
        .query({
          code: mockCode,
          state: mockOAuth.getState()
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });
  });

  describe('Token Management Tests', () => {
    let validToken: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: TEST_ADMIN.email,
          password: TEST_ADMIN.password
        });
      validToken = response.body.token;
    });

    it('should refresh valid token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.token).not.toBe(validToken);
    });

    it('should reject expired token', async () => {
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Token has expired');
    });
  });
});