// External dependencies
import * as winston from 'winston'; // ^3.8.2
import DailyRotateFile from 'winston-daily-rotate-file'; // ^4.7.1

// Log levels with severity mapping
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Interfaces for logger configuration and metadata
export interface LoggerOptions {
  service: string;
  level: string;
  enableConsole: boolean;
  enableFile: boolean;
  enableElk: boolean;
  elkHost?: string;
  elkPort?: number;
  elkRetryInterval?: number;
  elkBufferSize?: number;
  logRotationPattern?: string;
  maxLogSize?: number;
  maxFiles?: number;
  enableCompression?: boolean;
  enablePiiFiltering?: boolean;
}

export interface LogMetadata {
  service: string;
  timestamp: string;
  requestId?: string;
  correlationId?: string;
  userId?: string;
  environment?: string;
  additionalInfo?: Record<string, unknown>;
  performance?: {
    duration?: number;
    memory?: number;
    cpu?: number;
  };
  security?: {
    ipAddress?: string;
    userAgent?: string;
    authMethod?: string;
  };
}

/**
 * Enhanced singleton logger class with comprehensive logging capabilities
 * Provides structured logging, ELK integration, and advanced features
 */
export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;
  private options: LoggerOptions;
  private bufferPool: Map<string, any[]>;
  private readonly piiPatterns: RegExp[];

  private constructor(options: LoggerOptions) {
    this.options = options;
    this.bufferPool = new Map();
    this.piiPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone number
    ];

    this.initializeLogger();
  }

  /**
   * Get singleton instance of Logger
   */
  public static getInstance(options: LoggerOptions): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    }
    return Logger.instance;
  }

  /**
   * Initialize Winston logger with all configured transports
   */
  private initializeLogger(): void {
    const transports: winston.transport[] = [];

    // Console transport configuration
    if (this.options.enableConsole) {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(this.formatLogMessage.bind(this))
        )
      }));
    }

    // File transport configuration with rotation
    if (this.options.enableFile) {
      transports.push(new DailyRotateFile({
        filename: `logs/${this.options.service}-%DATE%.log`,
        datePattern: this.options.logRotationPattern || 'YYYY-MM-DD',
        maxSize: this.options.maxLogSize || '20m',
        maxFiles: this.options.maxFiles || '14d',
        zippedArchive: this.options.enableCompression || true,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }));
    }

    // ELK Stack transport configuration
    if (this.options.enableElk && this.options.elkHost) {
      // Implementation would include ELK transport setup
      // This is a placeholder for actual ELK integration
    }

    this.logger = winston.createLogger({
      levels: LOG_LEVELS,
      level: this.options.level || 'info',
      transports
    });
  }

  /**
   * Format log message with enhanced metadata
   */
  private formatLogMessage(info: winston.Logform.TransformableInfo): string {
    const { timestamp, level, message, ...meta } = info;
    return `${timestamp} [${level}] [${this.options.service}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta) : ''
    }`;
  }

  /**
   * Filter PII data from log content
   */
  private filterPii(content: string | Record<string, unknown>): any {
    if (!this.options.enablePiiFiltering) return content;

    if (typeof content === 'string') {
      let filteredContent = content;
      this.piiPatterns.forEach(pattern => {
        filteredContent = filteredContent.replace(pattern, '[REDACTED]');
      });
      return filteredContent;
    }

    if (typeof content === 'object') {
      const filtered = { ...content };
      Object.keys(filtered).forEach(key => {
        if (typeof filtered[key] === 'string') {
          filtered[key] = this.filterPii(filtered[key] as string);
        }
      });
      return filtered;
    }

    return content;
  }

  /**
   * Prepare metadata for logging
   */
  private prepareMetadata(meta?: Partial<LogMetadata>): LogMetadata {
    return {
      service: this.options.service,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      ...meta
    };
  }

  /**
   * Log error message with enhanced error tracking
   */
  public error(message: string, meta?: Partial<LogMetadata>, error?: Error): void {
    const enhancedMeta = this.prepareMetadata(meta);
    
    if (error) {
      enhancedMeta.additionalInfo = {
        ...enhancedMeta.additionalInfo,
        errorStack: error.stack,
        errorName: error.name
      };
    }

    this.logger.error(
      this.filterPii(message),
      this.filterPii(enhancedMeta)
    );
  }

  /**
   * Log warning message with context
   */
  public warn(message: string, meta?: Partial<LogMetadata>): void {
    this.logger.warn(
      this.filterPii(message),
      this.filterPii(this.prepareMetadata(meta))
    );
  }

  /**
   * Log info message with context
   */
  public info(message: string, meta?: Partial<LogMetadata>): void {
    this.logger.info(
      this.filterPii(message),
      this.filterPii(this.prepareMetadata(meta))
    );
  }

  /**
   * Log debug message with context
   */
  public debug(message: string, meta?: Partial<LogMetadata>): void {
    this.logger.debug(
      this.filterPii(message),
      this.filterPii(this.prepareMetadata(meta))
    );
  }
}