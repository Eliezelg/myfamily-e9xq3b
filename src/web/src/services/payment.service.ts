/**
 * Payment Service Implementation
 * Version: 1.0.0
 * 
 * Handles payment operations, family pool management, and transaction processing
 * with support for multiple currencies and payment providers.
 */

import { Observable, BehaviorSubject } from 'rxjs'; // ^7.0.0
import { catchError, retry } from 'rxjs/operators'; // ^7.0.0

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../constants/api.constants';
import { 
  IPayment, 
  IFamilyPool, 
  IPaymentRequest, 
  PaymentMethod,
  PaymentStatus 
} from '../interfaces/payment.interface';

/**
 * Enhanced payment service with comprehensive pool management and optimization
 */
export class PaymentService {
  private readonly poolSubject: BehaviorSubject<IFamilyPool | null>;
  private readonly transactionSubject: BehaviorSubject<IPayment[]>;
  
  public readonly pool$: Observable<IFamilyPool | null>;
  public readonly transactions$: Observable<IPayment[]>;

  // Target pool utilization percentage
  private readonly TARGET_UTILIZATION = 70;

  // Retry configuration for payment operations
  private readonly RETRY_CONFIG = {
    count: 3,
    delay: 1000
  };

  constructor() {
    // Initialize reactive state management
    this.poolSubject = new BehaviorSubject<IFamilyPool | null>(null);
    this.transactionSubject = new BehaviorSubject<IPayment[]>([]);

    // Setup pool observable with error handling
    this.pool$ = this.poolSubject.asObservable().pipe(
      catchError(error => {
        console.error('[PaymentService] Pool stream error:', error);
        return [];
      })
    );

    // Setup transactions observable with retry logic
    this.transactions$ = this.transactionSubject.asObservable().pipe(
      retry(this.RETRY_CONFIG.count),
      catchError(error => {
        console.error('[PaymentService] Transaction stream error:', error);
        return [];
      })
    );
  }

  /**
   * Retrieves current family pool balance and details
   */
  public async getFamilyPool(familyId: string): Promise<IFamilyPool> {
    try {
      const response = await apiService.get<IFamilyPool>(
        `${API_ENDPOINTS.PAYMENT.basePath}${API_ENDPOINTS.PAYMENT.endpoints.POOL.path}/${familyId}`
      );

      // Calculate and enhance pool metrics
      const enhancedPool = {
        ...response,
        utilization: this.calculatePoolUtilization(response)
      };

      this.poolSubject.next(enhancedPool);
      return enhancedPool;
    } catch (error) {
      console.error('[PaymentService] Failed to fetch family pool:', error);
      throw error;
    }
  }

  /**
   * Adds funds to family pool with enhanced validation
   */
  public async addFunds(request: IPaymentRequest): Promise<IPayment> {
    try {
      // Validate payment request
      this.validatePaymentRequest(request);

      // Process payment through appropriate provider
      const payment = await apiService.post<IPayment>(
        `${API_ENDPOINTS.PAYMENT.basePath}${API_ENDPOINTS.PAYMENT.endpoints.PROCESS.path}`,
        request
      );

      // Update local state if payment successful
      if (payment.status === PaymentStatus.COMPLETED) {
        await this.updatePoolBalance(request.familyId);
        this.addTransaction(payment);
      }

      return payment;
    } catch (error) {
      console.error('[PaymentService] Payment processing failed:', error);
      throw error;
    }
  }

  /**
   * Monitors and optimizes pool utilization
   */
  public monitorPoolUtilization(familyId: string): Observable<number> {
    return new Observable<number>(observer => {
      const interval = setInterval(async () => {
        try {
          const pool = await this.getFamilyPool(familyId);
          const utilization = this.calculatePoolUtilization(pool);

          observer.next(utilization);

          // Check if utilization is below target
          if (utilization < this.TARGET_UTILIZATION && pool.autoTopUp) {
            await this.handleLowUtilization(pool);
          }
        } catch (error) {
          observer.error(error);
        }
      }, 60000); // Check every minute

      // Cleanup on unsubscribe
      return () => clearInterval(interval);
    }).pipe(
      retry(this.RETRY_CONFIG.count),
      catchError(error => {
        console.error('[PaymentService] Utilization monitoring error:', error);
        return [];
      })
    );
  }

  /**
   * Validates payment request parameters
   */
  private validatePaymentRequest(request: IPaymentRequest): void {
    if (!request.familyId) {
      throw new Error('Family ID is required');
    }

    if (!request.amount || request.amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    if (!Object.values(PaymentMethod).includes(request.method)) {
      throw new Error('Invalid payment method');
    }

    // Additional currency validation
    const supportedCurrencies = ['USD', 'EUR', 'ILS', 'GBP', 'AUD'];
    if (!supportedCurrencies.includes(request.currency)) {
      throw new Error('Unsupported currency');
    }
  }

  /**
   * Calculates current pool utilization percentage
   */
  private calculatePoolUtilization(pool: IFamilyPool): number {
    if (!pool || pool.balance <= 0) return 0;
    
    // Calculate based on auto top-up threshold
    const utilization = (pool.balance / pool.autoTopUpThreshold) * 100;
    return Math.min(utilization, 100);
  }

  /**
   * Handles low pool utilization scenarios
   */
  private async handleLowUtilization(pool: IFamilyPool): Promise<void> {
    if (pool.balance <= pool.autoTopUpThreshold && pool.autoTopUp) {
      const topUpRequest: IPaymentRequest = {
        familyId: pool.familyId,
        amount: pool.autoTopUpAmount,
        currency: pool.currency,
        method: PaymentMethod.STRIPE, // Default to Stripe for auto top-up
        metadata: {
          type: 'AUTO_TOP_UP',
          triggered_at: new Date().toISOString()
        }
      };

      await this.addFunds(topUpRequest);
    }
  }

  /**
   * Updates pool balance after successful payment
   */
  private async updatePoolBalance(familyId: string): Promise<void> {
    const updatedPool = await this.getFamilyPool(familyId);
    this.poolSubject.next(updatedPool);
  }

  /**
   * Adds new transaction to local state
   */
  private addTransaction(payment: IPayment): void {
    const currentTransactions = this.transactionSubject.value;
    this.transactionSubject.next([payment, ...currentTransactions]);
  }
}

// Export singleton instance
export const paymentService = new PaymentService();