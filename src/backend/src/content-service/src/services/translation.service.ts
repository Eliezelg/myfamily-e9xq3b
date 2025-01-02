// External dependencies
import { v2 as translate } from '@google-cloud/translate'; // ^7.0.0
import Redis from 'ioredis'; // ^5.3.0

// Internal dependencies
import { Logger } from '../../../shared/utils/logger.util';
import { validateInput } from '../../../shared/utils/validation.util';

// Supported languages based on technical specification
const SUPPORTED_LANGUAGES = ['en', 'he', 'fr', 'es', 'de', 'ru', 'ar', 'zh'];
const CACHE_TTL = 86400; // 24 hours in seconds
const MAX_RETRIES = 3;
const BATCH_SIZE = 50;
const ERROR_THRESHOLD = 0.1;

export interface TranslationOptions {
  projectId: string;
  apiKey: string;
  cacheConfig: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    tls?: boolean;
  };
  maxRetries?: number;
  batchSize?: number;
  cacheTTL?: number;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  fromCache: boolean;
  processingTime: number;
}

export interface BatchTranslationResult {
  results: TranslationResult[];
  successCount: number;
  failureCount: number;
  processingTime: number;
}

export class TranslationService {
  private translationClient: translate.Translate;
  private cacheClient: Redis;
  private logger: Logger;
  private retryAttempts: number;
  private batchSize: number;
  private errorCounts: Map<string, number>;

  constructor(options: TranslationOptions) {
    // Initialize Google Cloud Translation client
    this.translationClient = new translate.Translate({
      projectId: options.projectId,
      key: options.apiKey
    });

    // Initialize Redis cache client
    this.cacheClient = new Redis({
      host: options.cacheConfig.host,
      port: options.cacheConfig.port,
      password: options.cacheConfig.password,
      db: options.cacheConfig.db || 0,
      tls: options.cacheConfig.tls,
      retryStrategy: (times: number) => {
        return Math.min(times * 50, 2000);
      }
    });

    // Initialize logger
    this.logger = Logger.getInstance({
      service: 'translation-service',
      level: 'info',
      enableConsole: true,
      enableFile: true,
      enableElk: true
    });

    this.retryAttempts = options.maxRetries || MAX_RETRIES;
    this.batchSize = options.batchSize || BATCH_SIZE;
    this.errorCounts = new Map();

    // Set up error monitoring
    this.cacheClient.on('error', (error) => {
      this.logger.error('Redis cache error', { error });
    });
  }

  /**
   * Translates content to target language with caching and error handling
   */
  public async translateContent(
    content: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResult> {
    const startTime = Date.now();

    try {
      // Validate input parameters
      await validateInput({ content, targetLanguage }, class {});
      
      if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
        throw new Error(`Unsupported target language: ${targetLanguage}`);
      }

      // Generate cache key
      const cacheKey = `translation:${sourceLanguage || 'auto'}:${targetLanguage}:${Buffer.from(content).toString('base64')}`;

      // Check cache first
      const cachedResult = await this.cacheClient.get(cacheKey);
      if (cachedResult) {
        const parsed = JSON.parse(cachedResult);
        return {
          ...parsed,
          fromCache: true,
          processingTime: Date.now() - startTime
        };
      }

      // Perform translation
      let result;
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          const [translation] = await this.translationClient.translate(content, {
            from: sourceLanguage,
            to: targetLanguage
          });

          result = {
            translatedText: translation,
            sourceLanguage: sourceLanguage || 'auto',
            targetLanguage,
            confidence: 1.0,
            fromCache: false,
            processingTime: Date.now() - startTime
          };

          // Cache successful translation
          await this.cacheClient.setex(
            cacheKey,
            CACHE_TTL,
            JSON.stringify(result)
          );

          break;
        } catch (error) {
          if (attempt === this.retryAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }

      this.logger.info('Translation completed', {
        sourceLanguage: sourceLanguage || 'auto',
        targetLanguage,
        processingTime: result.processingTime
      });

      return result;

    } catch (error) {
      this.logger.error('Translation failed', {
        error,
        content: content.substring(0, 100),
        targetLanguage
      });
      throw error;
    }
  }

  /**
   * Handles batch translation of multiple content items
   */
  public async batchTranslate(
    requests: Array<{
      content: string;
      targetLanguage: string;
      sourceLanguage?: string;
    }>
  ): Promise<BatchTranslationResult> {
    const startTime = Date.now();
    const results: TranslationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      // Process in batches
      for (let i = 0; i < requests.length; i += this.batchSize) {
        const batch = requests.slice(i, i + this.batchSize);
        const batchPromises = batch.map(async (request) => {
          try {
            const result = await this.translateContent(
              request.content,
              request.targetLanguage,
              request.sourceLanguage
            );
            successCount++;
            return result;
          } catch (error) {
            failureCount++;
            this.logger.error('Batch translation item failed', { error });
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(Boolean));
      }

      return {
        results,
        successCount,
        failureCount,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      this.logger.error('Batch translation failed', { error });
      throw error;
    }
  }

  /**
   * Clears translation cache with pattern matching
   */
  public async clearCache(pattern: string = '*'): Promise<void> {
    try {
      const keys = await this.cacheClient.keys(`translation:${pattern}`);
      if (keys.length > 0) {
        await this.cacheClient.del(...keys);
      }
      this.logger.info('Cache cleared', { pattern, keysCleared: keys.length });
    } catch (error) {
      this.logger.error('Cache clearing failed', { error, pattern });
      throw error;
    }
  }
}