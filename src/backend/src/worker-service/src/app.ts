/**
 * @fileoverview Main application entry point for the worker service with enhanced monitoring
 * @version 1.0.0
 */

import { NestFactory } from '@nestjs/core';
import { Queue } from 'bull';
import { Logger } from '../../../shared/utils/logger.util';
import { bullConfig } from './config/bull.config';
import { redisConfig } from './config/redis.config';
import { contentQueue } from './queues/content.queue';
import { gazetteQueue } from './queues/gazette.queue';
import { notificationQueue } from './queues/notification.queue';

// Initialize logger with correlation tracking
const logger = new Logger({
  service: 'WorkerService',
  level: 'info',
  enableConsole: true,
  enableFile: true,
  enableElk: true
});

// Environment variables with defaults
const PORT = process.env.WORKER_SERVICE_PORT || 3005;
const SHUTDOWN_TIMEOUT = parseInt(process.env.WORKER_SHUTDOWN_TIMEOUT || '30000', 10);

/**
 * Enhanced worker service class with comprehensive monitoring and health management
 */
class WorkerService {
  private readonly queues: Queue[];
  private isShuttingDown: boolean = false;

  constructor() {
    // Initialize queues with enhanced configuration
    this.queues = [contentQueue, gazetteQueue, notificationQueue];
  }

  /**
   * Initialize worker service with enhanced monitoring
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing worker service');

      // Initialize Redis connection pool
      await this.initializeRedisPool();

      // Initialize queue monitoring
      await this.initializeQueueMonitoring();

      // Initialize health checks
      await this.initializeHealthChecks();

      logger.info('Worker service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize worker service', {}, error as Error);
      throw error;
    }
  }

  /**
   * Initialize Redis connection pool with enhanced configuration
   */
  private async initializeRedisPool(): Promise<void> {
    try {
      const { connection, poolConfig } = redisConfig;
      logger.info('Initializing Redis connection pool', { poolSize: poolConfig.connectionPoolSize });
      // Redis pool initialization would be implemented here
    } catch (error) {
      logger.error('Failed to initialize Redis pool', {}, error as Error);
      throw error;
    }
  }

  /**
   * Initialize queue monitoring with metrics collection
   */
  private async initializeQueueMonitoring(): Promise<void> {
    try {
      const { monitoring } = bullConfig;
      
      // Set up monitoring for each queue
      this.queues.forEach(queue => {
        const queueName = queue.name;

        // Monitor queue metrics
        setInterval(async () => {
          const [waiting, active, completed, failed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount()
          ]);

          logger.info('Queue metrics', {
            queue: queueName,
            metrics: { waiting, active, completed, failed }
          });

          // Check against thresholds
          if (failed > monitoring.alertThresholds.failedCount) {
            logger.warn('High failure rate detected', {
              queue: queueName,
              failedCount: failed
            });
          }
        }, monitoring.checkInterval);
      });
    } catch (error) {
      logger.error('Failed to initialize queue monitoring', {}, error as Error);
      throw error;
    }
  }

  /**
   * Initialize health checks for queues and Redis
   */
  private async initializeHealthChecks(): Promise<void> {
    try {
      const { health } = bullConfig;
      
      setInterval(async () => {
        const healthStatus = await Promise.all(
          this.queues.map(async queue => {
            try {
              await queue.client.ping();
              return { queue: queue.name, status: 'healthy' };
            } catch (error) {
              return { queue: queue.name, status: 'unhealthy' };
            }
          })
        );

        logger.info('Health check completed', { status: healthStatus });
      }, health.interval);
    } catch (error) {
      logger.error('Failed to initialize health checks', {}, error as Error);
      throw error;
    }
  }

  /**
   * Graceful shutdown handler
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info('Initiating graceful shutdown');

    try {
      // Pause all queues
      await Promise.all(
        this.queues.map(queue => queue.pause(true))
      );

      // Wait for active jobs to complete
      const shutdownTimeout = setTimeout(() => {
        logger.warn('Shutdown timeout reached, forcing exit');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT);

      // Close all queues
      await Promise.all(
        this.queues.map(async queue => {
          await queue.close();
          logger.info(`Queue ${queue.name} closed`);
        })
      );

      clearTimeout(shutdownTimeout);
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {}, error as Error);
      process.exit(1);
    }
  }
}

/**
 * Bootstrap the worker service
 */
async function bootstrap(): Promise<void> {
  try {
    const workerService = new WorkerService();
    await workerService.initialize();

    // Register shutdown handlers
    process.on('SIGTERM', () => workerService.shutdown());
    process.on('SIGINT', () => workerService.shutdown());

    logger.info(`Worker service started on port ${PORT}`);
  } catch (error) {
    logger.error('Failed to start worker service', {}, error as Error);
    process.exit(1);
  }
}

// Start the worker service
bootstrap();