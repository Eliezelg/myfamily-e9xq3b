/**
 * @fileoverview Service implementation for managing family payment pools
 * @version 1.0.0
 */

import { injectable, inject } from 'inversify'; // v6.0.1
import { Logger } from 'winston'; // v3.8.2
import * as Sentry from '@sentry/node'; // v7.0.0
import { z } from 'zod'; // v3.0.0
import { Counter, Gauge, Histogram } from 'prom-client'; // v14.0.0

import { FamilyPool } from '../models/pool.model';
import { IFamilyPool, SupportedCurrency, isSupportedCurrency } from '../../../shared/interfaces/payment.interface';

@injectable()
export class PoolService {
  private readonly poolSchema: z.ZodSchema;
  private readonly poolMetrics: {
    balanceGauge: Gauge;
    utilizationGauge: Gauge;
    operationHistogram: Histogram;
    topUpCounter: Counter;
  };

  constructor(
    @inject('Logger') private readonly logger: Logger,
    @inject('PaymentService') private readonly paymentService: any,
    @inject('Sentry') private readonly sentry: typeof Sentry,
    @inject('Metrics') private readonly metrics: typeof import('prom-client'),
    @inject('RateLimiter') private readonly rateLimiter: any
  ) {
    this.initializeMetrics();
    this.initializeValidation();
  }

  /**
   * Initialize Prometheus metrics for monitoring
   */
  private initializeMetrics(): void {
    this.poolMetrics = {
      balanceGauge: new this.metrics.Gauge({
        name: 'family_pool_balance',
        help: 'Current balance in family pools',
        labelNames: ['family_id', 'currency']
      }),
      utilizationGauge: new this.metrics.Gauge({
        name: 'family_pool_utilization',
        help: 'Pool utilization rate percentage',
        labelNames: ['family_id']
      }),
      operationHistogram: new this.metrics.Histogram({
        name: 'family_pool_operation_duration',
        help: 'Duration of pool operations',
        labelNames: ['operation_type']
      }),
      topUpCounter: new this.metrics.Counter({
        name: 'family_pool_auto_topup_total',
        help: 'Number of automatic top-ups performed',
        labelNames: ['family_id']
      })
    };
  }

  /**
   * Initialize Zod validation schema
   */
  private initializeValidation(): void {
    this.poolSchema = z.object({
      familyId: z.string().uuid(),
      balance: z.number().min(0),
      currency: z.string().refine(isSupportedCurrency),
      autoTopUp: z.boolean(),
      autoTopUpThreshold: z.number().min(0).optional(),
      autoTopUpAmount: z.number().min(0).optional()
    });
  }

  /**
   * Create a new family payment pool
   */
  public async createPool(poolDetails: Partial<IFamilyPool>): Promise<IFamilyPool> {
    const timer = this.poolMetrics.operationHistogram.startTimer({ operation_type: 'create' });
    
    try {
      // Validate input data
      const validatedData = this.poolSchema.parse(poolDetails);

      // Check for existing pool
      const existingPool = await FamilyPool.findByFamilyId(validatedData.familyId);
      if (existingPool) {
        throw new Error('Family pool already exists');
      }

      // Create new pool with version control
      const pool = await FamilyPool.create({
        ...validatedData,
        version: 0,
        utilizationRate: 0
      });

      // Initialize metrics
      this.poolMetrics.balanceGauge.set(
        { family_id: pool.familyId, currency: pool.currency },
        pool.balance
      );
      this.poolMetrics.utilizationGauge.set(
        { family_id: pool.familyId },
        pool.utilizationRate
      );

      this.logger.info('Created new family pool', {
        familyId: pool.familyId,
        currency: pool.currency
      });

      return pool;
    } catch (error) {
      this.sentry.captureException(error);
      this.logger.error('Failed to create family pool', { error });
      throw error;
    } finally {
      timer();
    }
  }

  /**
   * Deduct amount from family pool with optimistic locking
   */
  public async deductFromPool(
    familyId: string,
    amount: number,
    currency: string
  ): Promise<IFamilyPool> {
    const timer = this.poolMetrics.operationHistogram.startTimer({ operation_type: 'deduct' });

    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(`pool_deduct_${familyId}`);

      // Input validation
      if (!isSupportedCurrency(currency)) {
        throw new Error('Unsupported currency');
      }

      // Acquire lock for atomic operation
      const lock = await this.paymentService.acquireLock(familyId);

      try {
        // Get pool with version control
        const pool = await FamilyPool.findById(familyId);
        if (!pool) {
          throw new Error('Family pool not found');
        }

        // Currency conversion if needed
        const convertedAmount = currency !== pool.currency
          ? await this.paymentService.convertCurrency(amount, currency, pool.currency)
          : amount;

        // Check sufficient balance
        if (pool.balance < convertedAmount) {
          throw new Error('Insufficient balance');
        }

        // Update pool with optimistic locking
        const updatedPool = await FamilyPool.updateOne(
          { _id: familyId, version: pool.version },
          {
            $inc: { balance: -convertedAmount, version: 1 },
            $set: { lastGazetteCharge: new Date() }
          }
        );

        if (!updatedPool.modifiedCount) {
          throw new Error('Concurrent modification detected');
        }

        // Update metrics
        this.poolMetrics.balanceGauge.set(
          { family_id: familyId, currency: pool.currency },
          pool.balance - convertedAmount
        );

        // Check auto top-up threshold
        if (pool.autoTopUp && (pool.balance - convertedAmount) <= pool.autoTopUpThreshold) {
          await this.handleAutoTopUp(pool);
        }

        this.logger.info('Successfully deducted from pool', {
          familyId,
          amount: convertedAmount,
          currency: pool.currency
        });

        return await FamilyPool.findById(familyId);
      } finally {
        await lock.release();
      }
    } catch (error) {
      this.sentry.captureException(error);
      this.logger.error('Failed to deduct from pool', {
        familyId,
        amount,
        currency,
        error
      });
      throw error;
    } finally {
      timer();
    }
  }

  /**
   * Handle automatic top-up of pool
   */
  private async handleAutoTopUp(pool: IFamilyPool): Promise<void> {
    try {
      await this.paymentService.processAutoTopUp(pool);
      this.poolMetrics.topUpCounter.inc({ family_id: pool.familyId });
      
      this.logger.info('Auto top-up processed', {
        familyId: pool.familyId,
        amount: pool.autoTopUpAmount
      });
    } catch (error) {
      this.sentry.captureException(error);
      this.logger.error('Auto top-up failed', {
        familyId: pool.familyId,
        error
      });
    }
  }
}