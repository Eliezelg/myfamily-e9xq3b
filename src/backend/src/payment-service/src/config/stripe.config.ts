/**
 * @fileoverview Stripe payment integration configuration with enhanced regional support
 * @version 1.0.0
 * @package stripe ^11.0.0
 * @package dotenv ^16.0.3
 */

import Stripe from 'stripe';
import { config } from 'dotenv';
import { PaymentMethod } from '../../../shared/interfaces/payment.interface';

// Initialize environment configuration
config();

/**
 * Interface for logging configuration
 */
interface LoggingConfig {
  logLevel: string;
  enableDebug: boolean;
  sensitiveFields: string[];
}

/**
 * Interface for monitoring configuration
 */
interface MonitoringConfig {
  enableMetrics: boolean;
  metricsInterval: number;
  alertThresholds: Record<string, number>;
}

/**
 * Interface for payment method configuration per region
 */
interface PaymentMethodConfig {
  enabled: boolean;
  requiredFields: string[];
  validationRules: Record<string, any>;
}

/**
 * Interface for regional compliance settings
 */
interface ComplianceConfig {
  requiredDocuments: string[];
  verificationLevel: string;
  regulatoryRequirements: string[];
}

/**
 * Interface for regional payment processing settings
 */
interface RegionalSettings {
  defaultCurrency: string;
  supportedRegions: string[];
  regionalPaymentMethods: Record<string, PaymentMethodConfig>;
  regionalCompliance: Record<string, ComplianceConfig>;
}

/**
 * Enhanced interface for Stripe configuration with regional support
 */
interface StripeConfig {
  secretKey: string;
  publicKey: string;
  webhookSecret: string;
  apiVersion: string;
  supportedCurrencies: string[];
  regionalSettings: RegionalSettings;
  loggingConfig: LoggingConfig;
  monitoringConfig: MonitoringConfig;
}

// Constants
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PUBLIC_KEY = process.env.STRIPE_PUBLIC_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_API_VERSION = '2023-10-16';
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'ILS', 'GBP', 'AUD'];

// Regional settings configuration
const REGIONAL_SETTINGS: RegionalSettings = {
  defaultCurrency: 'ILS',
  supportedRegions: ['IL', 'EU', 'NA', 'AU'],
  regionalPaymentMethods: {
    IL: {
      enabled: true,
      requiredFields: ['id_number'],
      validationRules: {
        idNumberFormat: /^\d{9}$/
      }
    },
    EU: {
      enabled: true,
      requiredFields: ['iban'],
      validationRules: {
        requireStrong3DS: true
      }
    },
    NA: {
      enabled: true,
      requiredFields: ['zip_code'],
      validationRules: {
        zipFormat: /^\d{5}(-\d{4})?$/
      }
    },
    AU: {
      enabled: true,
      requiredFields: ['bsb_number'],
      validationRules: {
        bsbFormat: /^\d{6}$/
      }
    }
  },
  regionalCompliance: {
    IL: {
      requiredDocuments: ['tax_id'],
      verificationLevel: 'high',
      regulatoryRequirements: ['israeli_tax_compliance']
    },
    EU: {
      requiredDocuments: ['vat_id'],
      verificationLevel: 'medium',
      regulatoryRequirements: ['gdpr_compliance', 'psd2_compliance']
    },
    NA: {
      requiredDocuments: ['w9_form'],
      verificationLevel: 'medium',
      regulatoryRequirements: ['pci_compliance']
    },
    AU: {
      requiredDocuments: ['abn'],
      verificationLevel: 'medium',
      regulatoryRequirements: ['aml_compliance']
    }
  }
};

/**
 * Validates Stripe configuration with comprehensive checks
 * @throws Error if configuration is invalid
 */
const validateStripeConfig = (): void => {
  if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith('sk_')) {
    throw new Error('Invalid or missing Stripe secret key');
  }

  if (!STRIPE_PUBLIC_KEY || !STRIPE_PUBLIC_KEY.startsWith('pk_')) {
    throw new Error('Invalid or missing Stripe public key');
  }

  if (!STRIPE_WEBHOOK_SECRET || !STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
    throw new Error('Invalid or missing Stripe webhook secret');
  }

  if (!SUPPORTED_CURRENCIES.length) {
    throw new Error('No supported currencies configured');
  }

  if (!REGIONAL_SETTINGS.supportedRegions.length) {
    throw new Error('No supported regions configured');
  }
};

/**
 * Creates and configures Stripe client with enhanced regional support
 * @returns Configured Stripe client instance
 */
const createStripeClient = (): Stripe => {
  validateStripeConfig();

  const stripe = new Stripe(STRIPE_SECRET_KEY!, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
    telemetry: false,
    maxNetworkRetries: 3
  });

  return stripe;
};

// Export configuration and client
export const stripeConfig: StripeConfig = {
  secretKey: STRIPE_SECRET_KEY!,
  publicKey: STRIPE_PUBLIC_KEY!,
  webhookSecret: STRIPE_WEBHOOK_SECRET!,
  apiVersion: STRIPE_API_VERSION,
  supportedCurrencies: SUPPORTED_CURRENCIES,
  regionalSettings: REGIONAL_SETTINGS,
  loggingConfig: {
    logLevel: 'info',
    enableDebug: process.env.NODE_ENV !== 'production',
    sensitiveFields: ['number', 'cvc', 'exp_month', 'exp_year']
  },
  monitoringConfig: {
    enableMetrics: true,
    metricsInterval: 60000,
    alertThresholds: {
      errorRate: 0.05,
      latencyMs: 2000,
      declineRate: 0.1
    }
  }
};

export const stripeClient = createStripeClient();