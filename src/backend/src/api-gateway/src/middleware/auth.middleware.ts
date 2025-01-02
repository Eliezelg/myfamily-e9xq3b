import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { IUserAuth, UserRole } from '../../../shared/interfaces/user.interface';

// Enhanced request interface with auth context
interface AuthenticatedRequest extends Request {
  user?: IUserAuth;
  securityContext?: ISecurityContext;
}

// Security context for request tracking and audit
interface ISecurityContext {
  requestId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// Role hierarchy configuration for permission inheritance
const roleHierarchy: { [key in UserRole]: UserRole[] } = {
  [UserRole.SYSTEM_ADMIN]: [UserRole.SYSTEM_ADMIN, UserRole.FAMILY_ADMIN, UserRole.CONTENT_CONTRIBUTOR, UserRole.MEMBER],
  [UserRole.FAMILY_ADMIN]: [UserRole.FAMILY_ADMIN, UserRole.CONTENT_CONTRIBUTOR, UserRole.MEMBER],
  [UserRole.CONTENT_CONTRIBUTOR]: [UserRole.CONTENT_CONTRIBUTOR, UserRole.MEMBER],
  [UserRole.MEMBER]: [UserRole.MEMBER]
};

// Role-specific rate limiting configuration
const rateLimiters: { [key in UserRole]: RateLimiterRedis } = {
  [UserRole.SYSTEM_ADMIN]: new RateLimiterRedis({
    points: 1000,
    duration: 60,
    keyPrefix: 'rl_system_admin'
  }),
  [UserRole.FAMILY_ADMIN]: new RateLimiterRedis({
    points: 500,
    duration: 60,
    keyPrefix: 'rl_family_admin'
  }),
  [UserRole.CONTENT_CONTRIBUTOR]: new RateLimiterRedis({
    points: 200,
    duration: 60,
    keyPrefix: 'rl_content_contributor'
  }),
  [UserRole.MEMBER]: new RateLimiterRedis({
    points: 100,
    duration: 60,
    keyPrefix: 'rl_member'
  })
};

/**
 * Creates a security context for request tracking and audit
 */
const createSecurityContext = (req: Request): ISecurityContext => ({
  requestId: req.headers['x-request-id'] as string || crypto.randomUUID(),
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'] || 'unknown',
  timestamp: new Date()
});

/**
 * Enhanced JWT authentication middleware
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token with specific algorithms
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ['HS256'],
      audience: process.env.JWT_AUDIENCE,
      issuer: process.env.JWT_ISSUER
    }) as IUserAuth;

    // Create and attach security context
    const securityContext = createSecurityContext(req);
    req.securityContext = securityContext;

    // Apply role-based rate limiting
    try {
      await rateLimiters[decoded.role].consume(decoded.userId);
    } catch (error) {
      console.error(`Rate limit exceeded for user ${decoded.userId}`, {
        securityContext,
        error
      });
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: error.msBeforeNext / 1000
      });
      return;
    }

    // Attach user info to request
    req.user = decoded;

    // Log successful authentication
    console.info('Authentication successful', {
      userId: decoded.userId,
      role: decoded.role,
      sessionId: decoded.sessionId,
      securityContext
    });

    next();
  } catch (error) {
    // Log authentication failure
    console.error('Authentication failed', {
      error: error.message,
      securityContext: req.securityContext || createSecurityContext(req)
    });

    res.status(401).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
};

/**
 * Enhanced authorization middleware factory with role hierarchy support
 */
export const authorize = (allowedRoles: UserRole[]): RequestHandler => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { user, securityContext } = req;

      if (!user || !securityContext) {
        throw new Error('Unauthorized - Missing user context');
      }

      // Check role hierarchy
      const hasPermission = allowedRoles.some(role => 
        roleHierarchy[user.role].includes(role)
      );

      if (!hasPermission) {
        throw new Error(`Insufficient permissions for role: ${user.role}`);
      }

      // Log successful authorization
      console.info('Authorization successful', {
        userId: user.userId,
        role: user.role,
        allowedRoles,
        securityContext
      });

      next();
    } catch (error) {
      // Log authorization failure
      console.error('Authorization failed', {
        error: error.message,
        user: req.user,
        securityContext: req.securityContext
      });

      res.status(403).json({
        error: 'Authorization failed',
        message: error.message
      });
    }
  };
};

export { createSecurityContext };