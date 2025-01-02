import { Job } from 'bull'; // v4.10.0
import { contentQueue } from '../queues/content.queue';
import { ImageService } from '../../../../content-service/src/services/image.service';
import { TranslationService } from '../../../../content-service/src/services/translation.service';
import { Logger } from '../../../../shared/utils/logger.util';
import { Counter, Histogram } from 'prom-client'; // v14.0.0

// Content processing constants
const MAX_RETRIES = 3;
const PROCESSING_TIMEOUT = 300000; // 5 minutes
const BATCH_SIZE = 10;

// Metrics for monitoring content processing
class ContentProcessingMetrics {
    private processingDuration: Histogram;
    private processingErrors: Counter;
    private successfulProcessing: Counter;

    constructor() {
        this.processingDuration = new Histogram({
            name: 'content_processing_duration_seconds',
            help: 'Duration of content processing operations',
            labelNames: ['type', 'status']
        });

        this.processingErrors = new Counter({
            name: 'content_processing_errors_total',
            help: 'Total number of content processing errors',
            labelNames: ['type', 'error']
        });

        this.successfulProcessing = new Counter({
            name: 'content_processing_success_total',
            help: 'Total number of successful content processing operations',
            labelNames: ['type']
        });
    }

    recordDuration(type: string, status: string, duration: number): void {
        this.processingDuration.labels(type, status).observe(duration);
    }

    incrementError(type: string, error: string): void {
        this.processingErrors.labels(type, error).inc();
    }

    incrementSuccess(type: string): void {
        this.successfulProcessing.labels(type).inc();
    }
}

// Interface for content processing job data
interface ContentProcessingJob {
    id: string;
    type: 'IMAGE' | 'TEXT';
    url: string;
    metadata: {
        width?: number;
        height?: number;
        format?: string;
        language?: string;
        quality?: number;
    };
    familyId: string;
    sourceLanguage: string;
    targetLanguages: string[];
    retryCount: number;
    processingOptions: {
        forPrint: boolean;
        quality?: number;
        withBleed?: boolean;
    };
}

// Initialize services and metrics
const logger = new Logger({
    service: 'ContentProcessingJob',
    level: 'info',
    enableConsole: true,
    enableFile: true,
    enableElk: true
});

const metrics = new ContentProcessingMetrics();

/**
 * Main content processing job handler
 */
export async function processContent(job: Job<ContentProcessingJob>): Promise<any> {
    const startTime = Date.now();
    const { id, type, url, metadata, familyId, processingOptions } = job.data;

    try {
        logger.info('Starting content processing', {
            contentId: id,
            type,
            familyId
        });

        // Check retry count
        if (job.data.retryCount >= MAX_RETRIES) {
            throw new Error(`Max retries (${MAX_RETRIES}) exceeded for content ${id}`);
        }

        // Process based on content type
        if (type === 'IMAGE') {
            const result = await handleImageProcessing(job.data);
            metrics.incrementSuccess('image');
            metrics.recordDuration('image', 'success', (Date.now() - startTime) / 1000);
            return result;
        } else if (type === 'TEXT') {
            const result = await handleTextProcessing(job.data);
            metrics.incrementSuccess('text');
            metrics.recordDuration('text', 'success', (Date.now() - startTime) / 1000);
            return result;
        }

        throw new Error(`Unsupported content type: ${type}`);

    } catch (error) {
        metrics.incrementError(type.toLowerCase(), error.message);
        metrics.recordDuration(type.toLowerCase(), 'error', (Date.now() - startTime) / 1000);

        logger.error('Content processing failed', {
            contentId: id,
            type,
            error: error.message
        }, error);

        // Retry logic
        if (job.data.retryCount < MAX_RETRIES) {
            await job.update({
                ...job.data,
                retryCount: (job.data.retryCount || 0) + 1
            });
            throw error; // Trigger retry
        }

        throw error;
    }
}

/**
 * Handles image content processing
 */
async function handleImageProcessing(jobData: ContentProcessingJob): Promise<any> {
    const imageService = new ImageService(logger, null);
    const { id, url, processingOptions, metadata } = jobData;

    // Validate image input
    if (!url) {
        throw new Error('Image URL is required');
    }

    // Process image for web and print if needed
    const webResult = await imageService.optimizeForWeb(Buffer.from(''), {
        quality: processingOptions.quality || 85
    });

    let printResult = null;
    if (processingOptions.forPrint) {
        printResult = await imageService.prepareForPrint(Buffer.from(''), {
            quality: 100,
            withBleed: processingOptions.withBleed
        });
    }

    return {
        contentId: id,
        web: {
            url: webResult.data,
            width: webResult.width,
            height: webResult.height,
            quality: webResult.quality
        },
        print: printResult ? {
            url: printResult.data,
            width: printResult.width,
            height: printResult.height,
            quality: printResult.quality,
            dpi: printResult.metadata.dpi
        } : null
    };
}

/**
 * Handles text content processing including translations
 */
async function handleTextProcessing(jobData: ContentProcessingJob): Promise<any> {
    const translationService = new TranslationService({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        apiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
        cacheConfig: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT),
            password: process.env.REDIS_PASSWORD
        }
    });

    const { id, sourceLanguage, targetLanguages, metadata } = jobData;

    // Validate translation requirements
    if (!targetLanguages || targetLanguages.length === 0) {
        throw new Error('Target languages are required for text processing');
    }

    // Process translations in batches
    const translationResults = await translationService.batchTranslate(
        targetLanguages.map(targetLang => ({
            content: metadata.content,
            targetLanguage: targetLang,
            sourceLanguage
        }))
    );

    return {
        contentId: id,
        translations: translationResults.results,
        stats: {
            successCount: translationResults.successCount,
            failureCount: translationResults.failureCount,
            processingTime: translationResults.processingTime
        }
    };
}

// Configure queue processor
contentQueue.process(BATCH_SIZE, processContent);

// Export for testing
export { handleImageProcessing, handleTextProcessing };