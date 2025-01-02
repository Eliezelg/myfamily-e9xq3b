import { PoolService } from '../../src/services/pool.service';
import { FamilyPool } from '../../src/models/pool.model';
import { SupportedCurrency, PaymentMethod } from '../../../shared/interfaces/payment.interface';
import { Logger } from 'winston'; // v3.8.2
import * as Sentry from '@sentry/node'; // v7.0.0
import { Counter, Gauge, Histogram } from 'prom-client'; // v14.0.0

jest.mock('../../src/models/pool.model');

describe('PoolService', () => {
  let poolService: PoolService;
  let mockLogger: jest.Mocked<Logger>;
  let mockPaymentService: jest.Mocked<any>;
  let mockSentry: jest.Mocked<typeof Sentry>;
  let mockMetrics: jest.Mocked<typeof import('prom-client')>;
  let mockRateLimiter: jest.Mocked<any>;

  const mockPool = {
    familyId: '123e4567-e89b-12d3-a456-426614174000',
    balance: 1000,
    currency: SupportedCurrency.ILS,
    autoTopUp: true,
    autoTopUpThreshold: 200,
    autoTopUpAmount: 500,
    utilizationRate: 0,
    version: 0
  };

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as any;

    mockPaymentService = {
      acquireLock: jest.fn(),
      convertCurrency: jest.fn(),
      processAutoTopUp: jest.fn()
    };

    mockSentry = {
      captureException: jest.fn()
    } as any;

    mockMetrics = {
      Gauge: jest.fn().mockImplementation(() => ({
        set: jest.fn()
      })),
      Counter: jest.fn().mockImplementation(() => ({
        inc: jest.fn()
      })),
      Histogram: jest.fn().mockImplementation(() => ({
        startTimer: jest.fn().mockReturnValue(() => {})
      }))
    } as any;

    mockRateLimiter = {
      checkLimit: jest.fn()
    };

    poolService = new PoolService(
      mockLogger,
      mockPaymentService,
      mockSentry,
      mockMetrics,
      mockRateLimiter
    );
  });

  describe('createPool', () => {
    it('should create pool with valid currency', async () => {
      const poolData = { ...mockPool };
      (FamilyPool.findByFamilyId as jest.Mock).mockResolvedValue(null);
      (FamilyPool.create as jest.Mock).mockResolvedValue(poolData);

      const result = await poolService.createPool(poolData);

      expect(result).toEqual(poolData);
      expect(FamilyPool.create).toHaveBeenCalledWith({
        ...poolData,
        version: 0,
        utilizationRate: 0
      });
    });

    it('should reject invalid currency', async () => {
      const poolData = { ...mockPool, currency: 'INVALID' };

      await expect(poolService.createPool(poolData)).rejects.toThrow();
      expect(mockSentry.captureException).toHaveBeenCalled();
    });

    it('should prevent duplicate pools', async () => {
      (FamilyPool.findByFamilyId as jest.Mock).mockResolvedValue(mockPool);

      await expect(poolService.createPool(mockPool)).rejects.toThrow('Family pool already exists');
    });
  });

  describe('deductFromPool', () => {
    const mockLock = { release: jest.fn() };

    beforeEach(() => {
      mockPaymentService.acquireLock.mockResolvedValue(mockLock);
      (FamilyPool.findById as jest.Mock).mockResolvedValue(mockPool);
      (FamilyPool.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });
    });

    it('should deduct amount with same currency', async () => {
      const amount = 100;
      await poolService.deductFromPool(mockPool.familyId, amount, SupportedCurrency.ILS);

      expect(FamilyPool.updateOne).toHaveBeenCalledWith(
        { _id: mockPool.familyId, version: mockPool.version },
        expect.any(Object)
      );
      expect(mockLock.release).toHaveBeenCalled();
    });

    it('should handle currency conversion', async () => {
      const amount = 100;
      const convertedAmount = 350;
      mockPaymentService.convertCurrency.mockResolvedValue(convertedAmount);

      await poolService.deductFromPool(mockPool.familyId, amount, SupportedCurrency.USD);

      expect(mockPaymentService.convertCurrency).toHaveBeenCalledWith(
        amount,
        SupportedCurrency.USD,
        SupportedCurrency.ILS
      );
    });

    it('should enforce rate limits', async () => {
      mockRateLimiter.checkLimit.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(
        poolService.deductFromPool(mockPool.familyId, 100, SupportedCurrency.ILS)
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle insufficient balance', async () => {
      const amount = 2000;

      await expect(
        poolService.deductFromPool(mockPool.familyId, amount, SupportedCurrency.ILS)
      ).rejects.toThrow('Insufficient balance');
    });

    it('should trigger auto top-up when threshold reached', async () => {
      const amount = 900;
      await poolService.deductFromPool(mockPool.familyId, amount, SupportedCurrency.ILS);

      expect(mockPaymentService.processAutoTopUp).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('poolUtilization', () => {
    beforeEach(() => {
      (FamilyPool.findById as jest.Mock).mockResolvedValue({
        ...mockPool,
        calculateUtilizationRate: jest.fn().mockResolvedValue(75)
      });
    });

    it('should track utilization rate after deduction', async () => {
      await poolService.deductFromPool(mockPool.familyId, 100, SupportedCurrency.ILS);

      expect(mockMetrics.Gauge.prototype.set).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Number)
      );
    });

    it('should handle utilization calculation errors', async () => {
      const mockPoolWithError = {
        ...mockPool,
        calculateUtilizationRate: jest.fn().mockRejectedValue(new Error('Calculation failed'))
      };
      (FamilyPool.findById as jest.Mock).mockResolvedValue(mockPoolWithError);

      await poolService.deductFromPool(mockPool.familyId, 100, SupportedCurrency.ILS);

      expect(mockSentry.captureException).toHaveBeenCalled();
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent modifications', async () => {
      (FamilyPool.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 0 });

      await expect(
        poolService.deductFromPool(mockPool.familyId, 100, SupportedCurrency.ILS)
      ).rejects.toThrow('Concurrent modification detected');
    });

    it('should release lock after error', async () => {
      const mockLock = { release: jest.fn() };
      mockPaymentService.acquireLock.mockResolvedValue(mockLock);
      (FamilyPool.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        poolService.deductFromPool(mockPool.familyId, 100, SupportedCurrency.ILS)
      ).rejects.toThrow();

      expect(mockLock.release).toHaveBeenCalled();
    });
  });

  describe('metrics collection', () => {
    it('should record operation durations', async () => {
      const timerSpy = jest.fn();
      (mockMetrics.Histogram.prototype.startTimer as jest.Mock).mockReturnValue(timerSpy);

      await poolService.createPool(mockPool);

      expect(timerSpy).toHaveBeenCalled();
    });

    it('should track auto top-up counts', async () => {
      const amount = 900;
      await poolService.deductFromPool(mockPool.familyId, amount, SupportedCurrency.ILS);

      expect(mockMetrics.Counter.prototype.inc).toHaveBeenCalledWith({
        family_id: mockPool.familyId
      });
    });
  });
});