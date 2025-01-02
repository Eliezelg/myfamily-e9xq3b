import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, TokenBlacklist } from '../../src/middleware/auth.middleware';
import { errorHandler, ApiError } from '../../src/middleware/error.middleware';
import { requestLoggingMiddleware } from '../../src/middleware/logging.middleware';
import { UserRole } from '../../../shared/interfaces/user.interface';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { HttpStatusCodes } from '../../../shared/constants/status-codes';

// Mock dependencies
jest.mock('../../../shared/utils/logger.util');
jest.mock('elastic-apm-node');

describe('API Gateway Middleware Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    // Reset mocks before each test
    mockRequest = {
      headers: {},
      ip: '127.0.0.1',
      method: 'GET',
      path: '/test',
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      getHeaders: jest.fn().mockReturnValue({}),
      end: jest.fn(),
    };

    nextFunction = jest.fn();
  });

  describe('Authentication Middleware', () => {
    const validToken = jwt.sign(
      {
        userId: 'test-user',
        role: UserRole.FAMILY_ADMIN,
        sessionId: 'test-session'
      },
      'test-secret'
    );

    test('should authenticate valid JWT token', async () => {
      process.env.JWT_SECRET = 'test-secret';
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };

      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.role).toBe(UserRole.FAMILY_ADMIN);
    });

    test('should reject missing token', async () => {
      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCodes.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication failed'
        })
      );
    });

    test('should reject blacklisted token', async () => {
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };

      // Simulate blacklisted token
      TokenBlacklist.isBlacklisted = jest.fn().mockResolvedValue(true);

      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCodes.UNAUTHORIZED);
    });
  });

  describe('Authorization Middleware', () => {
    beforeEach(() => {
      mockRequest.user = {
        userId: 'test-user',
        role: UserRole.FAMILY_ADMIN,
        sessionId: 'test-session'
      };
      mockRequest.securityContext = {
        requestId: 'test-request',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        timestamp: new Date()
      };
    });

    test('should authorize user with sufficient permissions', async () => {
      const authorizeMiddleware = authorize([UserRole.FAMILY_ADMIN]);
      await authorizeMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    test('should authorize user with inherited permissions', async () => {
      mockRequest.user!.role = UserRole.SYSTEM_ADMIN;
      const authorizeMiddleware = authorize([UserRole.FAMILY_ADMIN]);
      
      await authorizeMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    test('should reject user with insufficient permissions', async () => {
      mockRequest.user!.role = UserRole.MEMBER;
      const authorizeMiddleware = authorize([UserRole.FAMILY_ADMIN]);
      
      await authorizeMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCodes.FORBIDDEN);
    });
  });

  describe('Error Handler Middleware', () => {
    test('should handle ApiError with correlation ID', () => {
      const apiError = new ApiError(
        HttpStatusCodes.BAD_REQUEST,
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        { field: 'test' }
      );

      errorHandler(apiError, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          errorCode: ErrorCodes.VALIDATION_ERROR,
          correlationId: expect.any(String)
        })
      );
    });

    test('should handle generic Error with default error code', () => {
      const error = new Error('Unexpected error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCodes.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          errorCode: ErrorCodes.INTERNAL_SERVER_ERROR
        })
      );
    });

    test('should filter sensitive data from error details', () => {
      const apiError = new ApiError(
        HttpStatusCodes.BAD_REQUEST,
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        { password: 'secret', creditCard: '4111111111111111' }
      );

      errorHandler(apiError, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: {
            password: '[REDACTED]',
            creditCard: '[REDACTED]'
          }
        })
      );
    });
  });

  describe('Logging Middleware', () => {
    test('should attach request tracking metadata', () => {
      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.requestId).toBeDefined();
      expect(mockRequest.correlationId).toBeDefined();
      expect(mockRequest.startTime).toBeDefined();
      expect(mockRequest.performanceMetrics).toBeDefined();
    });

    test('should track response time and performance metrics', () => {
      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Simulate response completion
      mockResponse.end!();

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Response-Time', expect.stringMatching(/\d+ms/));
    });

    test('should log security-related information', () => {
      mockRequest.headers = {
        authorization: 'Bearer test-token',
        'user-agent': 'test-browser'
      };

      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Verify security context in logs
      expect(mockRequest.securityContext).toMatchObject({
        ipAddress: '127.0.0.1',
        userAgent: 'test-browser',
        authToken: '[PRESENT]'
      });
    });

    test('should handle errors during logging', () => {
      const logError = new Error('Logging failed');
      jest.spyOn(console, 'error').mockImplementation();
      
      // Force logging error
      mockResponse.getHeaders = jest.fn().mockImplementation(() => {
        throw logError;
      });

      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      mockResponse.end!();

      expect(console.error).toHaveBeenCalledWith('Logging error:', logError);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCodes.INTERNAL_SERVER_ERROR);
    });
  });
});