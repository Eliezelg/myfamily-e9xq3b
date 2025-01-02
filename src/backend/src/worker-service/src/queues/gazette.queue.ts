/**
 * @fileoverview Production-ready Bull queue configuration for gazette generation with high availability
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common'; // ^9.0.0
import { Queue, Job, JobOptions } from 'bull'; // ^4.10.0
import { bullConfig } from '../config/bull.config';
import { Gazette, GazetteStatus } from '../../../../shared/interfaces/gazette.interface';
import { GazetteGenerationJob } from '../jobs/gazette-generation.job';

// Queue configuration constants
const QUEUE_NAME = 'gazette-generation';
const MAX_CONCURRENT_JOBS = 5;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;
const JOB_TIMEOUT = 300000; // 5 minutes

/**
 * Interface for queue health metrics
 */
interface QueueHealth {
  isHealthy: boolean;
  metrics: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  lastChecked: Date;
}

@Injectable()
export class GazetteQueue {
  private readonly queue: Queue<Gazette>;
  private readonly logger: Logger;

  constructor(private readonly gazetteGenerationJob: GazetteGenerationJob) {
    this.logger = new Logger('GazetteQueue');
    
    // Initialize Bull queue with Redis cluster configuration
    this.queue = new Queue<Gazette>(QUEUE_NAME, {
      redis: bullConfig.redis,
      defaultJobOptions: {
        ...bullConfig.defaultJobOptions,
        attempts: MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: RETRY_DELAY
        },
        timeout: JOB_TIMEOUT,
        removeOnComplete: true,
        removeOnFail: false
      }
    });

    // Configure queue processor
    this.queue.process(MAX_CONCURRENT_JOBS, async (job: Job<Gazette>) => {
      return this.gazetteGenerationJob.process(job);
    });

    // Set up queue event listeners
    this.setupQueueListeners();

    // Initialize queue monitoring
    this.initializeQueueMonitoring();
  }

  /**
   * Adds a new gazette generation job to the queue
   */
  async addJob(gazette: Gazette, options?: JobOptions): Promise<Job<Gazette>> {
    try {
      this.logger.log(`Adding gazette generation job for gazette ID: ${gazette.id}`);

      // Validate gazette data
      if (!gazette.id || !gazette.familyId || !gazette.contentIds) {
        throw new Error('Invalid gazette data provided');
      }

      // Add job to queue with monitoring
      const job = await this.queue.add(gazette, {
        ...options,
        jobId: gazette.id,
        attempts: MAX_RETRIES,
        timeout: JOB_TIMEOUT
      });

      // Set up job progress tracking
      job.progress(0);
      
      this.logger.log(`Successfully added job ${job.id} to queue`);
      return job;

    } catch (error) {
      this.logger.error(`Failed to add gazette job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Removes a gazette generation job from the queue
   */
  async removeJob(jobId: string): Promise<void> {
    try {
      this.logger.log(`Removing job ${jobId} from queue`);
      
      const job = await this.queue.getJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      await job.remove();
      this.logger.log(`Successfully removed job ${jobId}`);

    } catch (error) {
      this.logger.error(`Failed to remove job ${jobId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Returns current queue health metrics
   */
  async getQueueHealth(): Promise<QueueHealth> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount()
      ]);

      const metrics = {
        waiting,
        active,
        completed,
        failed,
        delayed
      };

      // Check queue health based on thresholds
      const isHealthy = failed < bullConfig.monitoring.alertThresholds.failedCount &&
                       waiting < bullConfig.monitoring.alertThresholds.waitingCount;

      return {
        isHealthy,
        metrics,
        lastChecked: new Date()
      };

    } catch (error) {
      this.logger.error(`Failed to get queue health: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sets up queue event listeners for monitoring
   */
  private setupQueueListeners(): void {
    this.queue.on('error', (error) => {
      this.logger.error(`Queue error: ${error.message}`);
    });

    this.queue.on('failed', (job, error) => {
      this.handleFailedJob(job, error);
    });

    this.queue.on('stalled', (job) => {
      this.logger.warn(`Job ${job.id} has stalled`);
    });

    this.queue.on('completed', (job) => {
      this.logger.log(`Job ${job.id} completed successfully`);
    });
  }

  /**
   * Initializes queue monitoring with health checks
   */
  private initializeQueueMonitoring(): void {
    const interval = bullConfig.monitoring.checkInterval;

    setInterval(async () => {
      try {
        const health = await this.getQueueHealth();
        
        if (!health.isHealthy) {
          this.logger.warn('Queue health check failed', health.metrics);
        }

        // Clean up any stuck jobs
        await this.queue.clean(24 * 3600 * 1000, 'failed'); // Clean failed jobs older than 24h
        await this.queue.clean(24 * 3600 * 1000, 'completed'); // Clean completed jobs older than 24h

      } catch (error) {
        this.logger.error(`Queue monitoring error: ${error.message}`);
      }
    }, interval);
  }

  /**
   * Handles failed jobs with retry logic
   */
  private async handleFailedJob(job: Job<Gazette>, error: Error): Promise<void> {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);

    try {
      const gazette = job.data;
      
      if (job.attemptsMade >= MAX_RETRIES) {
        this.logger.error(`Job ${job.id} failed permanently after ${MAX_RETRIES} attempts`);
        
        // Update gazette status to error
        await this.gazetteGenerationJob.process(job);
      }

    } catch (handlingError) {
      this.logger.error(`Error handling failed job: ${handlingError.message}`);
    }
  }
}