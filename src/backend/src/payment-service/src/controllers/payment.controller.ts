/**
 * @fileoverview Payment controller for handling payment operations and family pool management
 * @version 1.0.0
 */

import { injectable, inject } from 'inversify'; // v6.0.1
import { 
  controller, 
  post, 
  get, 
  body, 
  param,
  use,
  HttpError
} from 'routing-controllers'; // v0.10.0
import { RateLimit } from 'express-rate-limit'; // v6.7.0
import { Logger } from 'winston';
import { z } from 'zod';

import { PaymentService } from '../services/payment.service';
import { PoolService } from '../services/pool.service';
import { 
  IPayment, 
  IFamilyPool,
  PaymentMethod,
  PaymentStatus,
  SupportedCurrency,
  isSupportedCurrency
} from '../../../shared/interfaces/payment.interface';

// Constants for validation and rate limiting
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100;
const MIN_PAYMENT_AMOUNT = 0.01;
const MAX_PAYMENT_AMOUNT = 10000;

@injectable()
@controller('/api/v1/payments')
@use(RateLimit({ 
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
  message: 'Too many payment requests'
}))
export class PaymentController {
  private readonly paymentSchema: z.ZodSchema;
  private readonly poolConfigSchema: z.ZodSchema;

  constructor(
    @inject('PaymentService') private readonly paymentService: PaymentService,
    @inject('PoolService') private readonly poolService: PoolService,
    @inject('Logger') private readonly logger: Logger
  ) {
    this.initializeValidation();
  }

  /**
   * Initialize Zod validation schemas
   */
  private initializeValidation(): void {
    this.paymentSchema = z.object({
      familyId: z.string().uuid(),
      amount: z.number().min(MIN_PAYMENT_AMOUNT).max(MAX_PAYMENT_AMOUNT),
      currency: z.string().refine(isSupportedCurrency),
      method: z.enum(Object.values(PaymentMethod)),
      description: z.string().min(1).max(500),
      promoCode: z.string().optional()
    });

    this.poolConfigSchema = z.object({
      autoTopUp: z.boolean(),
      autoTopUpThreshold: z.number().min(0),
      autoTopUpAmount: z.number().min(0),
      preferredPaymentMethod: z.enum(Object.values(PaymentMethod))
    });
  }

  /**
   * Process a new payment
   */
  @post('/process')
  @use(RateLimit({ windowMs: 60 * 1000, max: 10 }))
  async processPayment(@body() paymentDetails: IPayment): Promise<IPayment> {
    try {
      // Validate payment details
      const validatedData = this.paymentSchema.parse(paymentDetails);

      // Generate idempotency key
      const idempotencyKey = `${validatedData.familyId}-${Date.now()}`;

      // Process payment
      const payment = await this.paymentService.processPayment(
        validatedData,
        idempotencyKey
      );

      this.logger.info('Payment processed successfully', {
        paymentId: payment.id,
        familyId: payment.familyId,
        amount: payment.amount,
        currency: payment.currency
      });

      return payment;
    } catch (error) {
      this.logger.error('Payment processing failed', {
        error,
        paymentDetails
      });
      throw new HttpError(400, error.message);
    }
  }

  /**
   * Get family pool utilization metrics
   */
  @get('/pools/:familyId/utilization')
  async getPoolUtilization(
    @param('familyId') familyId: string
  ): Promise<{ utilizationRate: number; metrics: any }> {
    try {
      const pool = await this.poolService.getPoolMetrics(familyId);
      
      return {
        utilizationRate: pool.utilizationRate,
        metrics: {
          balance: pool.balance,
          lastTopUpDate: pool.lastTopUpDate,
          lastGazetteCharge: pool.lastGazetteCharge,
          autoTopUpEnabled: pool.autoTopUp
        }
      };
    } catch (error) {
      this.logger.error('Failed to get pool utilization', {
        error,
        familyId
      });
      throw new HttpError(400, error.message);
    }
  }

  /**
   * Configure automatic pool top-up
   */
  @post('/pools/:familyId/auto-topup')
  async configureAutoTopUp(
    @param('familyId') familyId: string,
    @body() config: Partial<IFamilyPool>
  ): Promise<IFamilyPool> {
    try {
      // Validate configuration
      const validatedConfig = this.poolConfigSchema.parse(config);

      // Update pool configuration
      const updatedPool = await this.poolService.configureAutoTopUp(
        familyId,
        validatedConfig
      );

      this.logger.info('Auto top-up configured', {
        familyId,
        config: validatedConfig
      });

      return updatedPool;
    } catch (error) {
      this.logger.error('Failed to configure auto top-up', {
        error,
        familyId,
        config
      });
      throw new HttpError(400, error.message);
    }
  }

  /**
   * Get payment status
   */
  @get('/:paymentId/status')
  async getPaymentStatus(
    @param('paymentId') paymentId: string
  ): Promise<{ status: PaymentStatus; details: any }> {
    try {
      const status = await this.paymentService.getPaymentStatus(paymentId);
      return status;
    } catch (error) {
      this.logger.error('Failed to get payment status', {
        error,
        paymentId
      });
      throw new HttpError(400, error.message);
    }
  }

  /**
   * Process payment refund
   */
  @post('/:paymentId/refund')
  @use(RateLimit({ windowMs: 60 * 1000, max: 5 }))
  async refundPayment(
    @param('paymentId') paymentId: string
  ): Promise<IPayment> {
    try {
      const refund = await this.paymentService.refundPayment(paymentId);
      
      this.logger.info('Payment refunded successfully', {
        paymentId,
        refundId: refund.id
      });

      return refund;
    } catch (error) {
      this.logger.error('Payment refund failed', {
        error,
        paymentId
      });
      throw new HttpError(400, error.message);
    }
  }
}