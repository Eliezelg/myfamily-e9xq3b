/**
 * @fileoverview Tranzillia payment gateway configuration for Israeli market
 * @version 1.0.0
 * @package dotenv ^16.0.3
 * @package validator ^13.7.0
 * @package node-cache ^5.1.2
 * @package winston ^3.8.0
 */

import { config } from 'dotenv';
import { isURL } from 'validator';
import NodeCache from 'node-cache';
import { Logger } from 'winston';
import { PaymentMethod } from '../../../shared/interfaces/payment.interface';

// Initialize environment configuration
config();

// Initialize configuration cache with 5 minute TTL
const configCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Create logger instance for configuration monitoring
const logger = new Logger({
  level: 'info',
  transports: [
    new Logger.transports.Console(),
    new Logger.transports.File({ filename: 'tranzillia-config.log' })
  ]
});

/**
 * Validation rules for Tranzillia configuration
 */
interface ValidationRules {
  terminalId: {
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
  apiKey: {
    minLength: number;
    pattern: RegExp;
  };
  timeout: {
    min: number;
    max: number;
  };
}

/**
 * Interface defining Tranzillia configuration structure
 */
interface TranzilliaConfig {
  terminalId: string;
  apiKey: string;
  apiUrl: string;
  sandboxMode: boolean;
  currency: string;
  timeout: number;
  validationRules: ValidationRules;
}

/**
 * Validation rules for Tranzillia configuration
 */
const validationRules: ValidationRules = {
  terminalId: {
    minLength: 8,
    maxLength: 12,
    pattern: /^[A-Z0-9]+$/
  },
  apiKey: {
    minLength: 32,
    pattern: /^[A-Za-z0-9]+$/
  },
  timeout: {
    min: 3000,
    max: 30000
  }
};

/**
 * Validates Tranzillia configuration
 * @throws Error if configuration is invalid
 */
function validateTranzilliaConfig(): void {
  logger.info('Validating Tranzillia configuration');

  // Check required environment variables
  if (!process.env.TRANZILLIA_TERMINAL_ID || 
      !process.env.TRANZILLIA_API_KEY || 
      !process.env.TRANZILLIA_API_URL) {
    throw new Error('Missing required Tranzillia configuration variables');
  }

  // Validate terminal ID
  const terminalId = process.env.TRANZILLIA_TERMINAL_ID;
  if (!validationRules.terminalId.pattern.test(terminalId) ||
      terminalId.length < validationRules.terminalId.minLength ||
      terminalId.length > validationRules.terminalId.maxLength) {
    throw new Error('Invalid Tranzillia terminal ID format');
  }

  // Validate API key
  const apiKey = process.env.TRANZILLIA_API_KEY;
  if (!validationRules.apiKey.pattern.test(apiKey) ||
      apiKey.length < validationRules.apiKey.minLength) {
    throw new Error('Invalid Tranzillia API key format');
  }

  // Validate API URL
  const apiUrl = process.env.TRANZILLIA_API_URL;
  if (!isURL(apiUrl, { protocols: ['https'], require_protocol: true })) {
    throw new Error('Invalid Tranzillia API URL format');
  }

  logger.info('Tranzillia configuration validation successful');
}

/**
 * Creates and configures Tranzillia client instance
 */
function createTranzilliaClient(): any {
  const cachedClient = configCache.get('tranzilliaClient');
  if (cachedClient) {
    return cachedClient;
  }

  validateTranzilliaConfig();

  const client = {
    terminalId: process.env.TRANZILLIA_TERMINAL_ID,
    apiKey: process.env.TRANZILLIA_API_KEY,
    apiUrl: process.env.TRANZILLIA_API_URL,
    sandboxMode: process.env.NODE_ENV !== 'production',
    currency: 'ILS',
    timeout: 15000,
    validationRules
  };

  configCache.set('tranzilliaClient', client);
  logger.info('Created new Tranzillia client instance');

  return client;
}

/**
 * Refreshes Tranzillia configuration with new values
 * @param updates Partial configuration updates
 */
async function refreshTranzilliaConfig(updates: Partial<TranzilliaConfig>): Promise<void> {
  logger.info('Refreshing Tranzillia configuration', { updates });

  const currentConfig = configCache.get('tranzilliaClient');
  if (!currentConfig) {
    throw new Error('No existing Tranzillia configuration found');
  }

  const newConfig = {
    ...currentConfig,
    ...updates,
    updatedAt: new Date()
  };

  validateTranzilliaConfig();
  configCache.set('tranzilliaClient', newConfig);

  logger.info('Tranzillia configuration refreshed successfully');
}

// Export configured client and configuration
export const tranzilliaConfig = createTranzilliaClient();
export const tranzilliaClient = tranzilliaConfig;

// Export configuration refresh function
export { refreshTranzilliaConfig };