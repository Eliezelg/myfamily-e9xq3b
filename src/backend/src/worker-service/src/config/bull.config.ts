import { Queue, QueueOptions } from 'bull'; // v4.10.0
import { redisConfig, connection, options, cluster } from './redis.config';

// Constants for queue configuration
const DEFAULT_ATTEMPTS = 5;
const DEFAULT_BACKOFF = {
  type: 'exponential' as const,
  delay: 5000,
  maxDelay: 60000
};
const DEFAULT_REMOVE_ON_COMPLETE = true;
const DEFAULT_REMOVE_ON_FAIL = false;
const MONITORING_CHECK_INTERVAL = 30000;
const HEALTH_CHECK_INTERVAL = 15000;

// Environment-based configuration
const REDIS_PREFIX = process.env.REDIS_PREFIX || 'myfamily:queue:';
const ENABLE_METRICS = process.env.ENABLE_QUEUE_METRICS === 'true';

/**
 * Interface for queue monitoring configuration
 */
interface MonitoringOptions {
  metrics: boolean;
  alertThresholds: {
    stalledCount: number;
    waitingCount: number;
    failedCount: number;
    delayedCount: number;
  };
  checkInterval: number;
}

/**
 * Interface for queue health check settings
 */
interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
}

/**
 * Enhanced interface for Bull queue configuration
 */
interface BullConfig {
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
    keyPrefix: string;
    enableReadyCheck: boolean;
    maxRetriesPerRequest: number;
    cluster?: typeof cluster;
  };
  defaultJobOptions: {
    attempts: number;
    backoff: typeof DEFAULT_BACKOFF;
    removeOnComplete: boolean;
    removeOnFail: boolean;
    priority?: number;
    timeout?: number;
  };
  settings: {
    lockDuration: number;
    lockRenewTime: number;
    stalledInterval: number;
    maxStalledCount: number;
    guardInterval: number;
  };
  health: HealthCheckConfig;
  monitoring: MonitoringOptions;
}

/**
 * Creates enhanced Bull queue configuration with monitoring and health checks
 * @param redisConfig Redis configuration object
 * @returns Enhanced Bull queue configuration
 */
const createBullConfig = (redisConfig: typeof connection): BullConfig => {
  // Base Redis configuration
  const redisOptions = {
    ...connection,
    keyPrefix: REDIS_PREFIX,
    enableReadyCheck: true,
    maxRetriesPerRequest: options.maxRetriesPerRequest,
    ...(cluster.enabled && { cluster })
  };

  // Default job processing options
  const defaultJobOptions = {
    attempts: DEFAULT_ATTEMPTS,
    backoff: DEFAULT_BACKOFF,
    removeOnComplete: DEFAULT_REMOVE_ON_COMPLETE,
    removeOnFail: DEFAULT_REMOVE_ON_FAIL,
    timeout: 30000, // 30 seconds default timeout
  };

  // Advanced queue settings
  const settings = {
    lockDuration: 30000, // 30 seconds lock duration
    lockRenewTime: 15000, // 15 seconds lock renewal
    stalledInterval: 30000, // Check for stalled jobs every 30 seconds
    maxStalledCount: 3, // Maximum number of stall checks
    guardInterval: 5000, // Guard process check interval
  };

  // Health check configuration
  const health: HealthCheckConfig = {
    enabled: true,
    interval: HEALTH_CHECK_INTERVAL,
    timeout: 5000,
  };

  // Monitoring configuration
  const monitoring: MonitoringOptions = {
    metrics: ENABLE_METRICS,
    alertThresholds: {
      stalledCount: 10,
      waitingCount: 100,
      failedCount: 50,
      delayedCount: 200,
    },
    checkInterval: MONITORING_CHECK_INTERVAL,
  };

  return {
    redis: redisOptions,
    defaultJobOptions,
    settings,
    health,
    monitoring,
  };
};

// Export the complete Bull configuration
export const bullConfig = createBullConfig(connection);

// Export individual components for flexible usage
export const {
  redis,
  defaultJobOptions,
  settings,
  health,
  monitoring,
} = bullConfig;