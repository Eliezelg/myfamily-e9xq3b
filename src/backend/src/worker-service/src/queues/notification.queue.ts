import { Queue, Job, JobOptions } from 'bull'; // v4.10.0
import { SES } from '@aws-sdk/client-ses'; // v3.0.0
import { RateLimiter } from 'limiter'; // v5.0.0
import { bullConfig } from '../config/bull.config';
import { Logger } from '../../../../shared/utils/logger.util';

// Queue configuration constants
const QUEUE_NAME = 'notifications';
const MAX_CONCURRENT_JOBS = 10;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_RETRY_ATTEMPTS = 5;
const ERROR_THRESHOLD = 0.05; // 5% error threshold

// Notification types and channels
enum NotificationType {
  CONTENT_UPDATE = 'CONTENT_UPDATE',
  GAZETTE_GENERATED = 'GAZETTE_GENERATED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED'
}

enum NotificationChannel {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS'
}

enum NotificationPriority {
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3
}

// Interfaces for notification data structures
interface NotificationContent {
  subject?: string;
  body: string;
  templateId?: string;
  metadata?: Record<string, any>;
}

interface NotificationJobData {
  type: NotificationType;
  recipientIds: string[];
  content: NotificationContent;
  priority: NotificationPriority;
  channels: NotificationChannel[];
}

interface NotificationMetrics {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  channelMetrics: Map<NotificationChannel, {
    sent: number;
    failed: number;
    latency: number[];
  }>;
}

/**
 * Singleton class managing the Bull queue for notification processing
 * with comprehensive error handling and delivery tracking
 */
export class NotificationQueue {
  private static instance: NotificationQueue;
  private queue: Queue<NotificationJobData>;
  private readonly sesClient: SES;
  private readonly rateLimiters: Map<NotificationChannel, RateLimiter>;
  private metrics: NotificationMetrics;
  private readonly logger: Logger;

  private constructor() {
    // Initialize Bull queue with enhanced configuration
    this.queue = new Queue<NotificationJobData>(QUEUE_NAME, {
      redis: bullConfig.redis,
      defaultJobOptions: {
        ...bullConfig.defaultJobOptions,
        attempts: MAX_RETRY_ATTEMPTS,
        removeOnComplete: true,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      }
    });

    // Initialize AWS SES client
    this.sesClient = new SES({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    // Initialize rate limiters for each channel
    this.rateLimiters = new Map([
      [NotificationChannel.EMAIL, new RateLimiter({ tokensPerInterval: 100, interval: RATE_LIMIT_WINDOW })],
      [NotificationChannel.PUSH, new RateLimiter({ tokensPerInterval: 200, interval: RATE_LIMIT_WINDOW })],
      [NotificationChannel.SMS, new RateLimiter({ tokensPerInterval: 50, interval: RATE_LIMIT_WINDOW })]
    ]);

    // Initialize metrics
    this.metrics = {
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0,
      channelMetrics: new Map()
    };

    this.logger = Logger.getInstance({
      service: 'notification-queue',
      level: 'info',
      enableConsole: true,
      enableFile: true,
      enableElk: true
    });

    this.initializeQueue();
  }

  /**
   * Initialize queue processors and error handlers
   */
  private initializeQueue(): void {
    // Configure concurrent job processing
    this.queue.process(MAX_CONCURRENT_JOBS, this.processNotification.bind(this));

    // Setup error handlers
    this.queue.on('error', (error) => {
      this.logger.error('Queue error occurred', { error: error.message });
    });

    this.queue.on('failed', (job, error) => {
      this.logger.error('Job failed', {
        jobId: job.id,
        error: error.message,
        attempts: job.attemptsMade
      });
    });

    // Setup completion monitoring
    this.queue.on('completed', (job) => {
      this.metrics.totalProcessed++;
      this.metrics.successCount++;
      this.logger.info('Job completed successfully', { jobId: job.id });
    });
  }

  /**
   * Gets or creates the singleton queue instance
   */
  public static getInstance(): NotificationQueue {
    if (!NotificationQueue.instance) {
      NotificationQueue.instance = new NotificationQueue();
    }
    return NotificationQueue.instance;
  }

  /**
   * Adds a new notification job with validation and priority handling
   */
  public async addNotificationJob(
    jobData: NotificationJobData,
    options?: JobOptions
  ): Promise<Job<NotificationJobData>> {
    try {
      // Validate job data
      this.validateJobData(jobData);

      // Set job options based on priority
      const jobOptions: JobOptions = {
        ...options,
        priority: jobData.priority,
        attempts: MAX_RETRY_ATTEMPTS,
        removeOnComplete: true
      };

      // Add job to queue
      const job = await this.queue.add(jobData, jobOptions);
      
      this.logger.info('Notification job added', {
        jobId: job.id,
        type: jobData.type,
        recipients: jobData.recipientIds.length
      });

      return job;
    } catch (error) {
      this.logger.error('Failed to add notification job', {}, error as Error);
      throw error;
    }
  }

  /**
   * Processes notification with multi-channel delivery
   */
  private async processNotification(job: Job<NotificationJobData>): Promise<void> {
    const startTime = Date.now();
    const { data } = job;

    try {
      // Process each channel sequentially
      for (const channel of data.channels) {
        // Check rate limits
        const limiter = this.rateLimiters.get(channel)!;
        await limiter.removeTokens(1);

        // Process based on channel type
        switch (channel) {
          case NotificationChannel.EMAIL:
            await this.processEmailNotification(data);
            break;
          case NotificationChannel.PUSH:
            await this.processPushNotification(data);
            break;
          case NotificationChannel.SMS:
            await this.processSmsNotification(data);
            break;
        }

        // Update channel metrics
        this.updateChannelMetrics(channel, Date.now() - startTime);
      }

      this.logger.info('Notification processed successfully', {
        jobId: job.id,
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.metrics.failureCount++;
      throw error; // Let Bull handle the retry
    }
  }

  /**
   * Process email notifications using AWS SES
   */
  private async processEmailNotification(data: NotificationJobData): Promise<void> {
    try {
      await this.sesClient.sendEmail({
        Destination: {
          ToAddresses: data.recipientIds
        },
        Message: {
          Subject: { Data: data.content.subject || '' },
          Body: { Text: { Data: data.content.body } }
        },
        Source: process.env.EMAIL_SENDER!
      });
    } catch (error) {
      this.logger.error('Email notification failed', {
        type: data.type,
        recipients: data.recipientIds
      }, error as Error);
      throw error;
    }
  }

  /**
   * Process push notifications
   */
  private async processPushNotification(data: NotificationJobData): Promise<void> {
    // Implementation for push notifications
    // This is a placeholder for actual push notification implementation
  }

  /**
   * Process SMS notifications
   */
  private async processSmsNotification(data: NotificationJobData): Promise<void> {
    // Implementation for SMS notifications
    // This is a placeholder for actual SMS implementation
  }

  /**
   * Validate notification job data
   */
  private validateJobData(data: NotificationJobData): void {
    if (!data.type || !Object.values(NotificationType).includes(data.type)) {
      throw new Error('Invalid notification type');
    }

    if (!data.recipientIds?.length) {
      throw new Error('Recipients are required');
    }

    if (!data.content?.body) {
      throw new Error('Notification content is required');
    }

    if (!data.channels?.length) {
      throw new Error('At least one notification channel is required');
    }
  }

  /**
   * Update metrics for notification channels
   */
  private updateChannelMetrics(channel: NotificationChannel, duration: number): void {
    const metrics = this.metrics.channelMetrics.get(channel) || {
      sent: 0,
      failed: 0,
      latency: []
    };

    metrics.sent++;
    metrics.latency.push(duration);

    // Keep only last 1000 latency measurements
    if (metrics.latency.length > 1000) {
      metrics.latency.shift();
    }

    this.metrics.channelMetrics.set(channel, metrics);
  }
}

// Export the notification queue instance
export const notificationQueue = NotificationQueue.getInstance();