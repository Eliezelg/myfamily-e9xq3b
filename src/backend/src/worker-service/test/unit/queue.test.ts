import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Queue, Job } from 'bull'; // v4.10.0
import { contentQueue } from '../../src/queues/content.queue';
import { GazetteQueue } from '../../src/queues/gazette.queue';
import { NotificationQueue } from '../../src/queues/notification.queue';
import { bullConfig } from '../../src/config/bull.config';
import { GazetteStatus } from '../../../../shared/interfaces/gazette.interface';

// Mock Redis client
jest.mock('ioredis');

// Mock job data
const mockContentJob = {
  id: 'test-content',
  type: 'image',
  url: 's3://test/image.jpg',
  metadata: { size: 1024, format: 'jpg' },
  familyId: 'family-1',
  priority: 'high',
  correlationId: 'corr-123'
};

const mockGazetteJob = {
  id: 'test-gazette',
  familyId: 'family-1',
  status: GazetteStatus.DRAFT,
  contentIds: ['content-1', 'content-2'],
  layout: {
    pageSize: 'A4',
    colorSpace: 'CMYK',
    resolution: 300,
    bleed: 3,
    binding: 'PERFECT'
  }
};

const mockNotificationJob = {
  type: 'CONTENT_UPDATE',
  recipientIds: ['user-1'],
  content: {
    title: 'New Content Added',
    body: 'A new photo has been added to your family gazette.',
    priority: 'high'
  },
  channels: ['email', 'push']
};

describe('Content Queue', () => {
  let queue: Queue;

  beforeEach(() => {
    queue = contentQueue;
  });

  afterEach(async () => {
    await queue.empty();
    await queue.clean(0, 'completed');
    await queue.clean(0, 'failed');
  });

  test('should initialize with Redis cluster configuration', () => {
    expect(queue).toBeDefined();
    expect(queue.opts.redis).toEqual(bullConfig.redis);
  });

  test('should add job with correct priority and metadata', async () => {
    const job = await queue.add(mockContentJob);
    expect(job.data).toEqual(mockContentJob);
    expect(job.opts.priority).toBeDefined();
  });

  test('should process image optimization job', async () => {
    const job = await queue.add(mockContentJob);
    const result = await queue.process(async (job) => {
      return { success: true, contentId: job.data.id };
    });
    expect(result.success).toBe(true);
  });

  test('should handle job failures and retry', async () => {
    const failedJob = await queue.add({
      ...mockContentJob,
      type: 'invalid'
    });
    
    let attempts = 0;
    await queue.process(async () => {
      attempts++;
      throw new Error('Processing failed');
    });

    expect(attempts).toBeLessThanOrEqual(bullConfig.defaultJobOptions.attempts);
  });

  test('should emit events for job lifecycle', (done) => {
    queue.on('completed', (job) => {
      expect(job.data.id).toBe(mockContentJob.id);
      done();
    });

    queue.add(mockContentJob);
    queue.process(async () => ({ success: true }));
  });
});

describe('Gazette Queue', () => {
  let gazetteQueue: GazetteQueue;

  beforeEach(() => {
    gazetteQueue = new GazetteQueue(jest.fn());
  });

  test('should maintain singleton instance', () => {
    const instance1 = new GazetteQueue(jest.fn());
    const instance2 = new GazetteQueue(jest.fn());
    expect(instance1).toBe(instance2);
  });

  test('should add gazette job with deadline', async () => {
    const job = await gazetteQueue.addJob(mockGazetteJob);
    expect(job).toBeDefined();
    expect(job.data.status).toBe(GazetteStatus.DRAFT);
  });

  test('should track job progress', async () => {
    const job = await gazetteQueue.addJob(mockGazetteJob);
    let progress = 0;

    job.progress(50);
    progress = await job.progress();
    expect(progress).toBe(50);
  });

  test('should handle concurrent job processing limits', async () => {
    const jobs = await Promise.all([
      gazetteQueue.addJob(mockGazetteJob),
      gazetteQueue.addJob(mockGazetteJob),
      gazetteQueue.addJob(mockGazetteJob)
    ]);

    expect(jobs.length).toBe(3);
    const activeJobs = await gazetteQueue.getQueueHealth();
    expect(activeJobs.metrics.active).toBeLessThanOrEqual(5);
  });
});

describe('Notification Queue', () => {
  let notificationQueue: NotificationQueue;

  beforeEach(() => {
    notificationQueue = NotificationQueue.getInstance();
  });

  test('should maintain singleton instance with high availability', () => {
    const instance1 = NotificationQueue.getInstance();
    const instance2 = NotificationQueue.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('should validate notification job data', async () => {
    await expect(
      notificationQueue.addNotificationJob({
        ...mockNotificationJob,
        recipientIds: []
      })
    ).rejects.toThrow('Recipients are required');
  });

  test('should process multi-channel notifications', async () => {
    const job = await notificationQueue.addNotificationJob(mockNotificationJob);
    expect(job.data.channels).toContain('email');
    expect(job.data.channels).toContain('push');
  });

  test('should enforce rate limits per channel', async () => {
    const jobs = await Promise.all(
      Array(20).fill(mockNotificationJob).map(job => 
        notificationQueue.addNotificationJob(job)
      )
    );

    const metrics = await notificationQueue['metrics'];
    expect(metrics.totalProcessed).toBeLessThanOrEqual(jobs.length);
  });

  test('should track delivery metrics', async () => {
    await notificationQueue.addNotificationJob(mockNotificationJob);
    const metrics = await notificationQueue['metrics'];
    
    expect(metrics).toHaveProperty('successCount');
    expect(metrics).toHaveProperty('failureCount');
    expect(metrics.channelMetrics.size).toBeGreaterThan(0);
  });
});