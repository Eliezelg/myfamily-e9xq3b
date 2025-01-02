/**
 * @fileoverview Advanced configuration for gazette shipping service with multi-provider support
 * @version 1.0.0
 */

import { GazetteStatus } from '../../../shared/interfaces/gazette.interface';
import * as dotenv from 'dotenv'; // ^16.0.3

// Initialize environment variables
dotenv.config();

// Global Constants
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 3;
const MAX_RATE_LIMIT = 100;
const SUPPORTED_REGIONS = ['Israel', 'Europe', 'North America', 'Australia'];
const CONFIG_VERSION = '1.0.0';

/**
 * Interface for individual shipping provider configuration
 */
interface ShippingProviderConfig {
  providerId: string;
  apiKey: string;
  endpoint: string;
  priority: number;
  rateLimit: number;
}

/**
 * Interface for webhook configuration
 */
interface WebhookConfig {
  endpoint: string;
  secret: string;
  timeoutMs: number;
  events: string[];
}

/**
 * Interface for retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

/**
 * Interface for logging configuration
 */
interface LogConfig {
  level: string;
  path: string;
  rotation: {
    maxFiles: number;
    maxSizeMb: number;
  };
}

/**
 * Region-specific shipping configuration
 */
interface RegionConfig {
  regionId: string;
  providers: ShippingProviderConfig[];
  defaultProvider: string;
  holidaySchedule: Record<string, string[]>;
}

/**
 * Enhanced shipping service configuration
 */
interface ShippingConfig {
  version: string;
  regions: Record<string, RegionConfig>;
  providers: Record<string, ShippingProviderConfig>;
  webhookConfig: WebhookConfig;
  retryPolicy: RetryConfig;
  logging: LogConfig;
}

/**
 * Loads and validates shipping configuration
 */
const loadConfig = (): ShippingConfig => {
  // Provider configurations
  const providers: Record<string, ShippingProviderConfig> = {
    israelPost: {
      providerId: 'israelPost',
      apiKey: process.env.ISRAEL_POST_API_KEY || '',
      endpoint: process.env.ISRAEL_POST_ENDPOINT || '',
      priority: 1,
      rateLimit: 60
    },
    dhl: {
      providerId: 'dhl',
      apiKey: process.env.DHL_API_KEY || '',
      endpoint: process.env.DHL_ENDPOINT || '',
      priority: 1,
      rateLimit: 100
    },
    fedex: {
      providerId: 'fedex',
      apiKey: process.env.FEDEX_API_KEY || '',
      endpoint: process.env.FEDEX_ENDPOINT || '',
      priority: 2,
      rateLimit: 80
    },
    ausPost: {
      providerId: 'ausPost',
      apiKey: process.env.AUS_POST_API_KEY || '',
      endpoint: process.env.AUS_POST_ENDPOINT || '',
      priority: 1,
      rateLimit: 50
    }
  };

  // Region-specific configurations
  const regions: Record<string, RegionConfig> = {
    Israel: {
      regionId: 'IL',
      providers: [providers.israelPost, providers.dhl],
      defaultProvider: 'israelPost',
      holidaySchedule: {
        '2024': ['2024-04-22', '2024-04-23', '2024-05-14'] // Example Jewish holidays
      }
    },
    Europe: {
      regionId: 'EU',
      providers: [providers.dhl, providers.fedex],
      defaultProvider: 'dhl',
      holidaySchedule: {
        '2024': ['2024-12-25', '2024-12-26'] // Example European holidays
      }
    },
    'North America': {
      regionId: 'NA',
      providers: [providers.fedex, providers.dhl],
      defaultProvider: 'fedex',
      holidaySchedule: {
        '2024': ['2024-12-25', '2024-07-04'] // Example US holidays
      }
    },
    Australia: {
      regionId: 'AU',
      providers: [providers.ausPost, providers.dhl],
      defaultProvider: 'ausPost',
      holidaySchedule: {
        '2024': ['2024-12-25', '2024-12-26'] // Example Australian holidays
      }
    }
  };

  // Webhook configuration
  const webhookConfig: WebhookConfig = {
    endpoint: process.env.SHIPPING_WEBHOOK_ENDPOINT || '',
    secret: process.env.SHIPPING_WEBHOOK_SECRET || '',
    timeoutMs: 5000,
    events: [GazetteStatus.SHIPPED, GazetteStatus.DELIVERED]
  };

  // Retry configuration
  const retryPolicy: RetryConfig = {
    maxAttempts: DEFAULT_RETRIES,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    timeoutMs: DEFAULT_TIMEOUT
  };

  // Logging configuration
  const logging: LogConfig = {
    level: process.env.LOG_LEVEL || 'info',
    path: process.env.LOG_PATH || '/var/log/shipping',
    rotation: {
      maxFiles: 10,
      maxSizeMb: 100
    }
  };

  return {
    version: CONFIG_VERSION,
    regions,
    providers,
    webhookConfig,
    retryPolicy,
    logging
  };
};

/**
 * Validates shipping configuration completeness
 */
const validateConfig = (config: ShippingConfig): boolean => {
  // Verify all required providers
  const requiredProviders = new Set(
    Object.values(config.regions).flatMap(region => 
      region.providers.map(provider => provider.providerId)
    )
  );

  for (const providerId of requiredProviders) {
    if (!config.providers[providerId]?.apiKey) {
      throw new Error(`Missing API key for provider: ${providerId}`);
    }
    if (!config.providers[providerId]?.endpoint) {
      throw new Error(`Missing endpoint for provider: ${providerId}`);
    }
  }

  // Validate region configurations
  for (const region of SUPPORTED_REGIONS) {
    if (!config.regions[region]) {
      throw new Error(`Missing configuration for region: ${region}`);
    }
    const regionConfig = config.regions[region];
    if (!regionConfig.providers.length) {
      throw new Error(`No providers configured for region: ${region}`);
    }
    if (!regionConfig.defaultProvider) {
      throw new Error(`No default provider set for region: ${region}`);
    }
  }

  // Validate webhook configuration
  if (!config.webhookConfig.endpoint || !config.webhookConfig.secret) {
    throw new Error('Invalid webhook configuration');
  }

  return true;
};

// Initialize and validate configuration
const shippingConfig = loadConfig();
validateConfig(shippingConfig);

// Export validated configuration
export default shippingConfig;