/**
 * @fileoverview Payment interfaces and enums for MyFamily platform
 * @version 1.0.0
 * @package mongoose ^6.9.0
 */

import { Types } from 'mongoose';

/**
 * Supported payment methods across different regions
 */
export enum PaymentMethod {
  STRIPE = 'STRIPE',        // International payments
  TRANZILLIA = 'TRANZILLIA', // Israeli market specific
  POOL = 'POOL'            // Internal family pool balance
}

/**
 * Payment transaction status tracking
 */
export enum PaymentStatus {
  PENDING = 'PENDING',         // Initial payment state
  PROCESSING = 'PROCESSING',   // Payment being processed
  COMPLETED = 'COMPLETED',     // Successfully processed
  FAILED = 'FAILED',          // Processing failed
  REFUNDED = 'REFUNDED'       // Payment refunded to source
}

/**
 * Supported currencies for international operations
 */
export enum SupportedCurrency {
  ILS = 'ILS',    // Israeli Shekel
  USD = 'USD',    // US Dollar
  EUR = 'EUR',    // Euro
  AUD = 'AUD'     // Australian Dollar
}

/**
 * Interface for payment transaction documents
 * Tracks individual payment operations with comprehensive metadata
 */
export interface IPayment {
  id: string;
  familyId: string;
  amount: number;
  currency: SupportedCurrency;
  method: PaymentMethod;
  status: PaymentStatus;
  description: string;
  promoCode: string | null;
  metadata: Record<string, any>;
  errorDetails: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for family payment pool documents
 * Manages shared family balance with auto top-up capabilities
 */
export interface IFamilyPool {
  id: string;
  familyId: string;
  balance: number;
  currency: SupportedCurrency;
  lastTopUpDate: Date;
  autoTopUp: boolean;
  autoTopUpThreshold: number;
  autoTopUpAmount: number;
  preferredPaymentMethod: PaymentMethod;
  utilizationRate: number;
  lastGazetteCharge: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Type guard to check if a string is a valid SupportedCurrency
 */
export const isSupportedCurrency = (currency: string): currency is SupportedCurrency => {
  return Object.values(SupportedCurrency).includes(currency as SupportedCurrency);
};

/**
 * Type guard to check if a string is a valid PaymentMethod
 */
export const isPaymentMethod = (method: string): method is PaymentMethod => {
  return Object.values(PaymentMethod).includes(method as PaymentMethod);
};

/**
 * Type guard to check if a string is a valid PaymentStatus
 */
export const isPaymentStatus = (status: string): status is PaymentStatus => {
  return Object.values(PaymentStatus).includes(status as PaymentStatus);
};