/**
 * @fileoverview Payment interface definitions for MyFamily platform
 * Supports multi-currency transactions, family pool management, and multiple payment processors
 * @version 1.0.0
 */

/**
 * Supported payment methods including international (Stripe) and regional (Tranzillia) processors
 */
export enum PaymentMethod {
    STRIPE = 'STRIPE',        // International payments processor
    TRANZILLIA = 'TRANZILLIA', // Israeli regional payments processor
    POOL = 'POOL'            // Internal family pool balance
}

/**
 * Payment transaction states throughout their lifecycle
 */
export enum PaymentStatus {
    PENDING = 'PENDING',         // Initial payment state
    PROCESSING = 'PROCESSING',   // Payment being processed by provider
    COMPLETED = 'COMPLETED',     // Successfully processed payment
    FAILED = 'FAILED',          // Failed payment transaction
    REFUNDED = 'REFUNDED'       // Refunded payment transaction
}

/**
 * Core payment transaction interface
 */
export interface IPayment {
    /** Unique payment transaction identifier */
    id: string;
    
    /** Associated family identifier */
    familyId: string;
    
    /** Payment amount in smallest currency unit (e.g., cents) */
    amount: number;
    
    /** ISO 4217 currency code (e.g., USD, EUR, ILS) */
    currency: string;
    
    /** Payment method used for transaction */
    method: PaymentMethod;
    
    /** Current status of the payment */
    status: PaymentStatus;
    
    /** Additional payment metadata for tracking and reconciliation */
    metadata: Record<string, any>;
    
    /** Payment creation timestamp */
    createdAt: Date;
    
    /** Last payment update timestamp */
    updatedAt: Date;
}

/**
 * Family payment pool management interface
 */
export interface IFamilyPool {
    /** Associated family identifier */
    familyId: string;
    
    /** Current pool balance in smallest currency unit */
    balance: number;
    
    /** ISO 4217 currency code for the pool */
    currency: string;
    
    /** Last successful top-up date */
    lastTopUpDate: Date;
    
    /** Whether automatic top-up is enabled */
    autoTopUp: boolean;
    
    /** Balance threshold triggering automatic top-up */
    autoTopUpThreshold: number;
    
    /** Amount to add during automatic top-up */
    autoTopUpAmount: number;
}

/**
 * Payment request interface for frontend initiation
 */
export interface IPaymentRequest {
    /** Target family identifier */
    familyId: string;
    
    /** Payment amount in smallest currency unit */
    amount: number;
    
    /** ISO 4217 currency code */
    currency: string;
    
    /** Selected payment method */
    method: PaymentMethod;
    
    /** Additional payment context and tracking data */
    metadata: Record<string, any>;
}