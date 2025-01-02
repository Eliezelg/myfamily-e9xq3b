/**
 * @fileoverview Enhanced shipping service implementation for gazette delivery management
 * @version 1.0.0
 */

import axios, { AxiosInstance } from 'axios'; // ^1.3.4
import winston from 'winston'; // ^3.8.2
import crypto from 'crypto';
import shippingConfig from '../config/shipping.config';
import { GazetteModel } from '../models/gazette.model';
import { GazetteStatus } from '../../../shared/interfaces/gazette.interface';

/**
 * Interface for shipping address with validation rules
 */
interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

/**
 * Interface for shipping rate information
 */
interface ShippingRate {
  providerId: string;
  cost: number;
  estimatedDays: number;
  service: string;
}

/**
 * Interface for shipment tracking information
 */
interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery: Date;
  events: Array<{
    timestamp: Date;
    location: string;
    status: string;
    description: string;
  }>;
}

/**
 * Interface for shipment creation response
 */
interface ShipmentResponse {
  shipmentId: string;
  trackingNumber: string;
  carrier: string;
  label: string;
  cost: number;
  estimatedDelivery: Date;
}

/**
 * Rate limiter implementation for API calls
 */
class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();
  private readonly windowMs: number = 60000; // 1 minute window

  constructor(private readonly limits: Record<string, number>) {}

  canMakeRequest(providerId: string): boolean {
    const limit = this.limits[providerId];
    const now = Date.now();
    const timestamps = this.timestamps.get(providerId) || [];
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(t => now - t < this.windowMs);
    
    if (validTimestamps.length >= limit) {
      return false;
    }
    
    this.timestamps.set(providerId, [...validTimestamps, now]);
    return true;
  }
}

/**
 * Enhanced shipping service implementation
 */
export class ShippingService {
  private readonly logger: winston.Logger;
  private readonly axiosInstances: Map<string, AxiosInstance> = new Map();
  private readonly rateLimiter: RateLimiter;

  constructor(private readonly gazetteModel: GazetteModel) {
    // Initialize structured logger
    this.logger = winston.createLogger({
      level: shippingConfig.logging.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: `${shippingConfig.logging.path}/shipping.log`,
          maxFiles: shippingConfig.logging.rotation.maxFiles,
          maxsize: shippingConfig.logging.rotation.maxSizeMb * 1024 * 1024
        })
      ]
    });

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(
      Object.fromEntries(
        Object.entries(shippingConfig.providers).map(([id, config]) => [
          id,
          config.rateLimit
        ])
      )
    );

    // Initialize axios instances for each provider
    Object.entries(shippingConfig.providers).forEach(([id, config]) => {
      this.axiosInstances.set(
        id,
        axios.create({
          baseURL: config.endpoint,
          timeout: shippingConfig.retryPolicy.timeoutMs,
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          }
        })
      );
    });
  }

  /**
   * Validates shipping address based on region-specific rules
   */
  private validateAddress(address: ShippingAddress): boolean {
    const region = Object.entries(shippingConfig.regions).find(([_, config]) =>
      config.regionId === address.country
    );

    if (!region) {
      throw new Error(`Unsupported shipping region: ${address.country}`);
    }

    // Region-specific validation rules
    const postalCodePatterns: Record<string, RegExp> = {
      IL: /^\d{5,7}$/,
      EU: /^[A-Z0-9]{3,10}$/,
      NA: /^\d{5}(-\d{4})?$/,
      AU: /^\d{4}$/
    };

    if (!postalCodePatterns[region[1].regionId].test(address.postalCode)) {
      throw new Error('Invalid postal code format for region');
    }

    return true;
  }

  /**
   * Selects optimal shipping provider for the region
   */
  private async selectProvider(
    address: ShippingAddress
  ): Promise<ShippingProviderConfig> {
    const region = Object.values(shippingConfig.regions).find(
      config => config.regionId === address.country
    );

    if (!region) {
      throw new Error(`No shipping providers available for region: ${address.country}`);
    }

    // Try providers in priority order
    for (const provider of region.providers) {
      if (this.rateLimiter.canMakeRequest(provider.providerId)) {
        return provider;
      }
    }

    throw new Error('Rate limits exceeded for all available providers');
  }

  /**
   * Creates a new shipment with enhanced validation and failover support
   */
  async createShipment(
    gazetteId: string,
    address: ShippingAddress
  ): Promise<ShipmentResponse> {
    try {
      // Validate address
      this.validateAddress(address);

      // Select optimal provider
      const provider = await this.selectProvider(address);

      // Create shipment with primary provider
      const axiosInstance = this.axiosInstances.get(provider.providerId);
      if (!axiosInstance) {
        throw new Error(`Provider not initialized: ${provider.providerId}`);
      }

      const response = await axiosInstance.post('/shipments', {
        address,
        service: 'standard',
        packageType: 'large_envelope',
        weight: 0.5, // kg
        dimensions: {
          length: 30, // cm
          width: 22, // cm
          height: 1 // cm
        }
      });

      const shipment: ShipmentResponse = {
        shipmentId: response.data.id,
        trackingNumber: response.data.tracking_number,
        carrier: provider.providerId,
        label: response.data.label_url,
        cost: response.data.cost,
        estimatedDelivery: new Date(response.data.estimated_delivery)
      };

      // Update gazette status
      await this.gazetteModel.updateStatus(gazetteId, GazetteStatus.SHIPPED);

      // Log shipping details
      this.logger.info('Shipment created', {
        gazetteId,
        shipment,
        provider: provider.providerId
      });

      return shipment;
    } catch (error) {
      this.logger.error('Shipment creation failed', {
        gazetteId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Processes shipping status webhook events
   */
  async handleWebhook(
    signature: string,
    payload: any
  ): Promise<void> {
    // Verify webhook signature
    const hmac = crypto.createHmac('sha256', shippingConfig.webhookConfig.secret);
    const calculatedSignature = hmac
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== calculatedSignature) {
      throw new Error('Invalid webhook signature');
    }

    try {
      if (payload.event === 'delivery.completed') {
        await this.gazetteModel.updateStatus(
          payload.gazette_id,
          GazetteStatus.DELIVERED
        );
      }

      this.logger.info('Webhook processed', {
        event: payload.event,
        gazetteId: payload.gazette_id
      });
    } catch (error) {
      this.logger.error('Webhook processing failed', {
        event: payload.event,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Retrieves shipping rates for a given address
   */
  async getShippingRates(address: ShippingAddress): Promise<ShippingRate[]> {
    try {
      const provider = await this.selectProvider(address);
      const axiosInstance = this.axiosInstances.get(provider.providerId);

      if (!axiosInstance) {
        throw new Error(`Provider not initialized: ${provider.providerId}`);
      }

      const response = await axiosInstance.post('/rates', {
        address,
        packageType: 'large_envelope',
        weight: 0.5,
        dimensions: {
          length: 30,
          width: 22,
          height: 1
        }
      });

      return response.data.rates.map((rate: any) => ({
        providerId: provider.providerId,
        cost: rate.cost,
        estimatedDays: rate.estimated_days,
        service: rate.service
      }));
    } catch (error) {
      this.logger.error('Failed to retrieve shipping rates', {
        error: error.message
      });
      throw error;
    }
  }
}