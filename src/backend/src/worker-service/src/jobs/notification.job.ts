import { Job } from 'bull'; // v4.10.0
import { SES } from '@aws-sdk/client-ses'; // v3.0.0
import { Logger } from '../../../../shared/utils/logger.util';
import { NotificationQueue } from '../queues/notification.queue';

// Constants for notification processing
const NOTIFICATION_TYPES = {
  CONTENT_UPDATE: 'content_update',
  GAZETTE_GENERATED: 'gazette_generated',
  PAYMENT_PROCESSED: 'payment_processed'
} as const;

const PRIORITY_LEVELS = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
  BULK: 5
} as const;

const RETRY_CONFIG = {
  MAX_RETRIES: 5,
  BASE_DELAY: 1000,
  MAX_DELAY: 30000,
  BACKOFF_FACTOR: 2
} as const;

const RATE_LIMITS = {
  PER_RECIPIENT: 10,
  TIME_WINDOW: 3600,
  BURST_LIMIT: 3
} as const;

// Interface for notification job data
export interface NotificationJobData {
  type: keyof typeof NOTIFICATION_TYPES;
  recipientIds: string[];
  content: {
    title: string;
    body: string;
    metadata?: Record<string, any>;
    templateId?: string;
    templateVersion?: string;
  };
  priority: keyof typeof PRIORITY_LEVELS;
  tracking: {
    correlationId: string;
    batchId?: string;
    attempts: number;
  };
}

/**
 * Process notification job with enhanced reliability and tracking
 */
export async function processNotification(job: Job<NotificationJobData>): Promise<void> {
  const logger = Logger.getInstance({
    service: 'notification-job',
    level: 'info',
    enableConsole: true,
    enableFile: true,
    enableElk: true
  });

  const startTime = Date.now();
  const { data } = job;

  try {
    logger.info('Processing notification', {
      jobId: job.id,
      type: data.type,
      correlationId: data.tracking.correlationId,
      recipients: data.recipientIds.length
    });

    // Validate notification data
    validateNotificationData(data);

    // Format email content with template
    const emailContent = await formatEmailContent(data);

    // Get notification queue instance
    const notificationQueue = NotificationQueue.getInstance();

    // Process notification with tracking
    await notificationQueue.trackDelivery(
      job.id as string,
      data.tracking.correlationId,
      async () => {
        // Update job progress
        await job.progress(50);

        // Send notification through queue
        await notificationQueue.getInstance().processEmailNotification(data);

        // Update job progress
        await job.progress(100);
      }
    );

    // Log successful processing
    logger.info('Notification processed successfully', {
      jobId: job.id,
      type: data.type,
      duration: Date.now() - startTime,
      correlationId: data.tracking.correlationId
    });
  } catch (error) {
    // Log error with details
    logger.error('Failed to process notification', {
      jobId: job.id,
      type: data.type,
      correlationId: data.tracking.correlationId,
      attempt: data.tracking.attempts,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error as Error);

    // Increment attempt count
    data.tracking.attempts++;

    // Check if should retry
    if (data.tracking.attempts >= RETRY_CONFIG.MAX_RETRIES) {
      logger.error('Max retry attempts reached', {
        jobId: job.id,
        correlationId: data.tracking.correlationId
      });
      throw new Error('Max retry attempts reached');
    }

    // Calculate backoff delay
    const backoffDelay = Math.min(
      RETRY_CONFIG.BASE_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_FACTOR, data.tracking.attempts),
      RETRY_CONFIG.MAX_DELAY
    );

    // Throw error for Bull to handle retry with backoff
    throw error;
  }
}

/**
 * Format email content using templates and recipient preferences
 */
async function formatEmailContent(data: NotificationJobData): Promise<object> {
  const { content, recipientIds } = data;
  
  // Basic template validation
  if (content.templateId && !content.templateVersion) {
    throw new Error('Template version is required when using templates');
  }

  // Format based on notification type
  const formattedContent = {
    subject: content.title,
    body: content.body,
    metadata: {
      ...content.metadata,
      notificationType: data.type,
      timestamp: new Date().toISOString()
    }
  };

  if (content.templateId) {
    // Add template metadata
    formattedContent.metadata = {
      ...formattedContent.metadata,
      templateId: content.templateId,
      templateVersion: content.templateVersion
    };
  }

  return formattedContent;
}

/**
 * Validate notification data structure and content
 */
function validateNotificationData(data: NotificationJobData): void {
  // Validate notification type
  if (!Object.keys(NOTIFICATION_TYPES).includes(data.type)) {
    throw new Error(`Invalid notification type: ${data.type}`);
  }

  // Validate recipients
  if (!data.recipientIds?.length) {
    throw new Error('Recipients are required');
  }

  // Validate content
  if (!data.content?.body) {
    throw new Error('Notification content is required');
  }

  // Validate priority
  if (!Object.keys(PRIORITY_LEVELS).includes(data.priority)) {
    throw new Error(`Invalid priority level: ${data.priority}`);
  }

  // Validate tracking data
  if (!data.tracking?.correlationId) {
    throw new Error('Correlation ID is required for tracking');
  }
}