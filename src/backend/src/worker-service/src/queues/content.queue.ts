import { Queue, QueueOptions, Job } from 'bull'; // v4.10.0
import { bullConfig } from '../config/bull.config';
import { Logger } from '../../../../shared/utils/logger.util';

// Queue configuration constants
const QUEUE_NAME = 'content-processing';
const CONCURRENCY = 3;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

// Initialize logger
const logger = new Logger({
  service: 'ContentQueue',
  level: 'info',
  enableConsole: true,
  enableFile: true,
  enableElk: true
});

// Content types supported by the queue
enum ContentType {
  IMAGE = 'image',
  TEXT = 'text'
}

// Interface for content metadata
interface ContentMetadata {
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  quality?: number;
  language?: string;
  wordCount?: number;
  hasTranslation?: boolean;
  processingStage?: string;
}

// Interface for content processing job data
interface ContentJobData {
  id: string;
  type: ContentType;
  url: string;
  metadata: ContentMetadata;
  familyId: string;
  priority: number;
  correlationId: string;
}

// Queue event monitoring decorator
function MonitorQueue() {
  return function (target: any) {
    return class extends target {
      constructor(...args: any[]) {
        super(...args);
        this.enableMetrics();
      }

      private enableMetrics(): void {
        // Implementation of queue metrics collection
      }
    };
  };
}

/**
 * Creates and configures the content processing queue with enhanced features
 * @returns Configured Bull queue instance with high availability
 */
@MonitorQueue()
function createContentQueue(): Queue<ContentJobData> {
  const queueOptions: QueueOptions = {
    redis: bullConfig.redis,
    defaultJobOptions: {
      ...bullConfig.defaultJobOptions,
      attempts: MAX_RETRIES,
      backoff: {
        type: 'exponential',
        delay: RETRY_DELAY
      },
      removeOnComplete: true,
      removeOnFail: false
    },
    settings: {
      lockDuration: 30000,
      stalledInterval: 30000,
      maxStalledCount: 2,
      guardInterval: 5000
    }
  };

  const queue = new Queue<ContentJobData>(QUEUE_NAME, queueOptions);

  // Configure queue processing
  queue.process(CONCURRENCY, async (job: Job<ContentJobData>) => {
    const { id, type, url, metadata, familyId, correlationId } = job.data;
    
    logger.info('Processing content job', {
      correlationId,
      jobId: job.id,
      contentId: id,
      type,
      familyId
    });

    try {
      // Content processing implementation would go here
      await job.progress(100);
      return { success: true, contentId: id };
    } catch (error) {
      logger.error('Content processing failed', {
        correlationId,
        jobId: job.id,
        contentId: id,
        error: error.message
      }, error);
      throw error;
    }
  });

  handleQueueEvents(queue);

  return queue;
}

/**
 * Sets up enhanced event handlers for the content queue
 * @param queue Bull queue instance
 */
function handleQueueEvents(queue: Queue<ContentJobData>): void {
  queue.on('completed', (job: Job<ContentJobData>) => {
    logger.info('Job completed successfully', {
      correlationId: job.data.correlationId,
      jobId: job.id,
      contentId: job.data.id
    });
  });

  queue.on('failed', (job: Job<ContentJobData>, error: Error) => {
    logger.error('Job failed', {
      correlationId: job.data.correlationId,
      jobId: job.id,
      contentId: job.data.id,
      error: error.message
    }, error);
  });

  queue.on('stalled', (job: Job<ContentJobData>) => {
    logger.warn('Job stalled', {
      correlationId: job.data.correlationId,
      jobId: job.id,
      contentId: job.data.id
    });
  });

  queue.on('error', (error: Error) => {
    logger.error('Queue error occurred', {
      queueName: QUEUE_NAME,
      error: error.message
    }, error);
  });

  // Graceful shutdown handler
  process.on('SIGTERM', async () => {
    logger.info('Gracefully shutting down queue');
    await queue.pause(true);
    await queue.close();
    process.exit(0);
  });
}

// Create and export the content queue instance
export const contentQueue = createContentQueue();

// Export queue types for consumers
export type { ContentJobData, ContentType, ContentMetadata };