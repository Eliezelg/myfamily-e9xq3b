import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import supertest from 'supertest';
import StripeMock from 'stripe-mock';

import { PaymentService } from '../../src/services/payment.service';
import { PoolService } from '../../src/services/pool.service';
import { Payment } from '../../src/models/payment.model';
import { FamilyPool } from '../../src/models/pool.model';
import { 
  PaymentMethod, 
  PaymentStatus, 
  SupportedCurrency,
  IPayment,
  IFamilyPool 
} from '../../../shared/interfaces/payment.interface';
import { stripeConfig } from '../../src/config/stripe.config';

describe('Payment Service Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let redisContainer: StartedTestContainer;
  let stripeMock: StripeMock;
  let paymentService: PaymentService;
  let poolService: PoolService;

  // Test data
  const testFamilyId = 'test-family-123';
  const testPaymentId = 'test-payment-123';
  const testPoolId = 'test-pool-123';

  beforeAll(async () => {
    // Setup MongoDB memory server
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();

    // Setup Redis container
    redisContainer = await new GenericContainer('redis:6.2-alpine')
      .withExposedPorts(6379)
      .start();
    process.env.REDIS_URL = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;

    // Setup Stripe mock server
    stripeMock = new StripeMock();
    await stripeMock.start(12111);
    process.env.STRIPE_API_BASE = 'http://localhost:12111';

    // Initialize services with test configuration
    const logger = { info: jest.fn(), error: jest.fn() };
    const monitor = { recordMetric: jest.fn(), startTransaction: jest.fn() };
    const errorTracker = { captureException: jest.fn() };

    paymentService = new PaymentService(logger, monitor, errorTracker);
    poolService = new PoolService(logger, paymentService, errorTracker, monitor, {});

    // Seed test data
    await seedTestData();
  });

  afterAll(async () => {
    await mongoServer.stop();
    await redisContainer.stop();
    await stripeMock.stop();
  });

  describe('Multi-Currency Payment Processing', () => {
    test('should process USD payment through Stripe successfully', async () => {
      const payment: Partial<IPayment> = {
        familyId: testFamilyId,
        amount: 100,
        currency: SupportedCurrency.USD,
        method: PaymentMethod.STRIPE,
        description: 'Test USD payment'
      };

      const result = await paymentService.processPayment(payment, 'test-idempotency-key');

      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(result.currency).toBe(SupportedCurrency.USD);
      expect(result.metadata.stripePaymentStatus).toBe('succeeded');
    });

    test('should process ILS payment through Tranzillia successfully', async () => {
      const payment: Partial<IPayment> = {
        familyId: testFamilyId,
        amount: 350,
        currency: SupportedCurrency.ILS,
        method: PaymentMethod.TRANZILLIA,
        description: 'Test ILS payment'
      };

      const result = await paymentService.processPayment(payment, 'test-idempotency-key-ils');

      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(result.currency).toBe(SupportedCurrency.ILS);
    });

    test('should reject unsupported currency combinations', async () => {
      const payment: Partial<IPayment> = {
        familyId: testFamilyId,
        amount: 100,
        currency: SupportedCurrency.ILS,
        method: PaymentMethod.STRIPE,
        description: 'Invalid currency test'
      };

      await expect(
        paymentService.processPayment(payment, 'test-idempotency-key-invalid')
      ).rejects.toThrow('Currency not supported for this payment method');
    });
  });

  describe('Family Pool Management', () => {
    test('should create and manage family pool with auto top-up', async () => {
      const poolDetails: Partial<IFamilyPool> = {
        familyId: testFamilyId,
        balance: 1000,
        currency: SupportedCurrency.USD,
        autoTopUp: true,
        autoTopUpThreshold: 200,
        autoTopUpAmount: 500
      };

      const pool = await poolService.createPool(poolDetails);
      expect(pool.balance).toBe(1000);
      expect(pool.autoTopUp).toBe(true);

      // Test pool deduction
      const updatedPool = await poolService.deductFromPool(testFamilyId, 300, SupportedCurrency.USD);
      expect(updatedPool.balance).toBe(700);

      // Verify auto top-up trigger
      const finalPool = await poolService.deductFromPool(testFamilyId, 600, SupportedCurrency.USD);
      expect(finalPool.balance).toBeGreaterThan(0);
      expect(finalPool.lastTopUpDate).toBeDefined();
    });

    test('should track pool utilization rate', async () => {
      const pool = await FamilyPool.findOne({ familyId: testFamilyId });
      expect(pool.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(pool.utilizationRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Payment Provider Integration', () => {
    test('should handle Stripe payment provider failover', async () => {
      // Simulate Stripe outage
      stripeMock.setFailureMode(true);

      const payment: Partial<IPayment> = {
        familyId: testFamilyId,
        amount: 100,
        currency: SupportedCurrency.USD,
        method: PaymentMethod.STRIPE,
        description: 'Failover test payment'
      };

      const result = await paymentService.processPayment(payment, 'test-idempotency-key-failover');
      expect(result.status).not.toBe(PaymentStatus.FAILED);
      expect(result.metadata.failoverAttempted).toBe(true);
    });

    test('should validate regional compliance requirements', async () => {
      const payment: Partial<IPayment> = {
        familyId: testFamilyId,
        amount: 100,
        currency: SupportedCurrency.EUR,
        method: PaymentMethod.STRIPE,
        description: 'EU compliance test'
      };

      const result = await paymentService.processPayment(payment, 'test-idempotency-key-eu');
      expect(result.metadata.complianceChecks).toBeDefined();
      expect(result.metadata.complianceChecks.psd2Validated).toBe(true);
    });
  });

  describe('Refund Processing', () => {
    test('should process full refund successfully', async () => {
      const payment = await Payment.findOne({ familyId: testFamilyId });
      const refund = await paymentService.refundPayment(payment.id, payment.amount);

      expect(refund.status).toBe(PaymentStatus.REFUNDED);
      expect(refund.metadata.refundAmount).toBe(payment.amount);
    });

    test('should handle partial refund with currency conversion', async () => {
      const payment = await Payment.findOne({ 
        familyId: testFamilyId,
        currency: SupportedCurrency.USD 
      });

      const refundAmount = payment.amount / 2;
      const refund = await paymentService.refundPayment(payment.id, refundAmount);

      expect(refund.status).toBe(PaymentStatus.COMPLETED);
      expect(refund.metadata.partialRefund).toBe(true);
      expect(refund.metadata.refundAmount).toBe(refundAmount);
    });
  });

  // Helper function to seed test data
  async function seedTestData() {
    // Create test payment records
    await Payment.create({
      familyId: testFamilyId,
      amount: 100,
      currency: SupportedCurrency.USD,
      method: PaymentMethod.STRIPE,
      status: PaymentStatus.COMPLETED,
      description: 'Seed test payment'
    });

    // Create test pool
    await FamilyPool.create({
      familyId: testFamilyId,
      balance: 1000,
      currency: SupportedCurrency.USD,
      autoTopUp: true,
      autoTopUpThreshold: 200,
      autoTopUpAmount: 500
    });
  }
});