import { Redis } from 'ioredis'; // v5.3.0
import { RedisConfig } from '../../shared/interfaces/config.interface';

// Connection retry and timeout constants
const DEFAULT_RETRY_ATTEMPTS = 5;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_CONNECT_TIMEOUT = 10000;
const DEFAULT_KEY_PREFIX = 'myfamily:worker:';
const MAX_RETRIES = 10;
const MAX_RECONNECT_DELAY = 30000;
const MIN_RECONNECT_DELAY = 1000;
const CONNECTION_POOL_SIZE = 10;
const HEALTH_CHECK_INTERVAL = 5000;

// Environment variables with defaults
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
const REDIS_DB = parseInt(process.env.REDIS_DB || '0');
const REDIS_CLUSTER_MODE = process.env.REDIS_CLUSTER_MODE === 'true';
const REDIS_TLS_ENABLED = process.env.REDIS_TLS_ENABLED === 'true';
const REDIS_SENTINEL_ENABLED = process.env.REDIS_SENTINEL_ENABLED === 'true';

/**
 * Creates Redis configuration with enhanced connection settings and high availability features
 * @returns Complete Redis configuration object
 */
const createRedisConfig = (): RedisConfig => {
  // Base connection configuration
  const connection = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    db: REDIS_DB,
    keyPrefix: DEFAULT_KEY_PREFIX,
  };

  // Enhanced connection options
  const options = {
    // Connection management
    connectTimeout: DEFAULT_CONNECT_TIMEOUT,
    maxRetriesPerRequest: DEFAULT_RETRY_ATTEMPTS,
    enableReadyCheck: true,
    autoResubscribe: true,
    autoResendUnfulfilledCommands: true,
    lazyConnect: true,

    // Connection pool settings
    connectionPoolSize: CONNECTION_POOL_SIZE,
    connectionPoolMinIdle: Math.floor(CONNECTION_POOL_SIZE / 2),

    // Retry strategy with exponential backoff
    retryStrategy: (times: number) => {
      if (times > MAX_RETRIES) {
        return null; // Stop retrying
      }
      const delay = Math.min(
        Math.min(times * DEFAULT_RETRY_DELAY, MAX_RECONNECT_DELAY),
        MIN_RECONNECT_DELAY
      );
      return delay;
    },

    // Health monitoring
    healthCheck: true,
    healthCheckInterval: HEALTH_CHECK_INTERVAL,
  };

  // Cluster configuration
  const cluster = REDIS_CLUSTER_MODE ? {
    enabled: true,
    nodes: [{ host: REDIS_HOST, port: REDIS_PORT }],
    options: {
      scaleReads: 'slave',
      maxRedirections: 16,
      retryDelayOnFailover: 2000,
      retryDelayOnClusterDown: 1000,
      enableOfflineQueue: true,
    },
  } : { enabled: false };

  // Sentinel configuration for high availability
  const sentinel = REDIS_SENTINEL_ENABLED ? {
    enabled: true,
    sentinels: [{ host: REDIS_HOST, port: REDIS_PORT }],
    name: 'mymaster',
    role: 'master',
    sentinelRetryStrategy: (times: number) => {
      if (times > MAX_RETRIES) return null;
      return Math.min(times * 1000, MAX_RECONNECT_DELAY);
    },
  } : { enabled: false };

  // TLS configuration if enabled
  const tls = REDIS_TLS_ENABLED ? {
    enabled: true,
    rejectUnauthorized: true, // Enforce valid certificates
    ca: process.env.REDIS_CA_CERT,
    cert: process.env.REDIS_CLIENT_CERT,
    key: process.env.REDIS_CLIENT_KEY,
  } : { enabled: false };

  return {
    ...connection,
    options,
    cluster,
    sentinel,
    tls,
  } as RedisConfig;
};

// Export the complete Redis configuration
export const redisConfig = createRedisConfig();

// Export individual components for flexible usage
export const {
  connection,
  options,
  cluster,
  sentinel,
} = redisConfig;