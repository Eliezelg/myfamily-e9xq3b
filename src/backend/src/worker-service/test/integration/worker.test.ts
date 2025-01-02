/**
 * @fileoverview Comprehensive integration tests for worker service functionality
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bull';
import { RedisCluster } from 'ioredis';
import { WorkerService } from '../../src/app';
import { Logger } from '../../../../shared/utils/logger.util';
import { GazetteStatus } from '../../../../shared/interfaces/gazette.interface';

// Initialize logger with correlation tracking
const logger = new Logger({
  service: 'WorkerServiceTest',
  level: 'info',
  enableConsole: true,
  enableFile: true,
  enableElk: true
});

// Test configuration constants
const TEST_TIMEOUT = 30000;
const REDIS_CLUSTER_CONFIG = {
  nodes: [
    { host: 'localhost', port: 6379 },
    { host: 'localhost', port: 6380 },
    { host: 'localhost', port: 6381 }
  ],
  options: {
    maxRedirections: 3,
    retryDelayOnFailover: 1000
  }
};

describe('WorkerService Integration Tests', () => {
  let module: TestingModule;
  let workerService: WorkerService;
  let redisCluster: RedisCluster;
  let contentQueue: Queue;
  let gazetteQueue: Queue;
  let notificationQueue: Queue;

  /**
   * Sets up test module with enhanced configuration
   */
  beforeEach(async () => {
    // Initialize Redis cluster
    redisCluster = new RedisCluster(REDIS_CLUSTER_CONFIG.nodes, REDIS_CLUSTER_CONFIG.options);

    // Create test module
    module = await Test.createTestingModule({
      providers: [
        WorkerService,
        {
          provide: 'REDIS_CLUSTER',
          useValue: redisCluster
        },
        {
          provide: 'BULL_CONFIG',
          useValue: {
            redis: {
              cluster: REDIS_CLUSTER_CONFIG
            },
            defaultJobOptions: {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 1000
              },
              removeOnComplete: true,
              removeOnFail: false
            }
          }
        }
      ]
    }).compile();

    workerService = module.get<WorkerService>(WorkerService);
    contentQueue = module.get<Queue>('ContentQueue');
    gazetteQueue = module.get<Queue>('GazetteQueue');
    notificationQueue = module.get<Queue>('NotificationQueue');

    await workerService.onModuleInit();
  });

  afterEach(async () => {
    await Promise.all([
      contentQueue.clean(0, 'completed'),
      contentQueue.clean(0, 'failed'),
      gazetteQueue.clean(0, 'completed'),
      gazetteQueue.clean(0, 'failed'),
      notificationQueue.clean(0, 'completed'),
      notificationQueue.clean(0, 'failed')
    ]);
    await module.close();
    await redisCluster.quit();
  });

  /**
   * Tests high availability through Redis cluster failover
   */
  it('should handle Redis cluster failover', async () => {
    jest.setTimeout(TEST_TIMEOUT);

    // Create test job
    const testJob = await createMockJob('image', { width: 800, height: 600 });
    await contentQueue.add(testJob);

    // Simulate primary node failure
    const primaryNode = REDIS_CLUSTER_CONFIG.nodes[0];
    await redisCluster.disconnect([primaryNode]);

    // Verify automatic failover
    const jobResult = await new Promise((resolve) => {
      contentQueue.on('completed', (job) => {
        resolve(job.returnvalue);
      });
    });

    expect(jobResult).toBeDefined();
    expect(jobResult.success).toBe(true);
  }, TEST_TIMEOUT);

  /**
   * Tests dead letter queue processing
   */
  it('should process dead letter queue items', async () => {
    // Create failing job
    const failingJob = await createMockJob('invalid', {});
    await contentQueue.add(failingJob);

    // Wait for job to fail and move to DLQ
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Process DLQ
    const dlqResults = await workerService.processDeadLetterQueue();

    expect(dlqResults.processed).toBeGreaterThan(0);
    expect(dlqResults.recovered).toBe(0);
  });

  /**
   * Tests end-to-end gazette generation workflow
   */
  it('should process gazette generation workflow', async () => {
    // Create gazette with test content
    const gazetteJob = {
      id: 'test-gazette',
      familyId: 'test-family',
      status: GazetteStatus.DRAFT,
      contentIds: ['content-1', 'content-2'],
      layout: {
        pageSize: 'A4',
        colorSpace: 'CMYK',
        resolution: 300,
        bleed: 3
      }
    };

    await gazetteQueue.add(gazetteJob);

    // Wait for complete workflow
    const result = await new Promise((resolve) => {
      gazetteQueue.on('completed', (job) => {
        resolve(job.returnvalue);
      });
    });

    expect(result).toBeDefined();
    expect(result.status).toBe(GazetteStatus.READY_FOR_PRINT);
  });

  /**
   * Tests notification delivery with circuit breaker
   */
  it('should handle notification delivery with circuit breaker', async () => {
    const notifications = Array.from({ length: 5 }, (_, i) => ({
      type: 'CONTENT_UPDATE',
      recipientIds: [`user-${i}`],
      content: {
        subject: 'Test Notification',
        body: 'Test message'
      },
      priority: 1,
      channels: ['EMAIL']
    }));

    // Add notification jobs
    await Promise.all(notifications.map(n => notificationQueue.add(n)));

    // Verify circuit breaker behavior
    const results = await Promise.all([
      new Promise(resolve => {
        notificationQueue.on('completed', (job) => {
          resolve(job.returnvalue);
        });
      }),
      new Promise(resolve => {
        notificationQueue.on('failed', (job, error) => {
          resolve({ error: error.message });
        });
      })
    ]);

    expect(results).toContainEqual(expect.objectContaining({
      success: true
    }));
  });
});

/**
 * Creates mock job data for testing
 */
function createMockJob(type: string, metadata: any, correlationId?: string): any {
  return {
    id: `test-${Date.now()}`,
    type,
    metadata,
    correlationId: correlationId || `corr-${Date.now()}`,
    timestamp: new Date().toISOString()
  };
}